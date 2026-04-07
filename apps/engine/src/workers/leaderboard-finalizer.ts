import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import { LeaderboardService } from '../services/mechanics/leaderboard.service'
import { LeaderboardCacheService } from '../services/mechanics/leaderboard-cache.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export function startLeaderboardFinalizer(
  connection: Redis,
  db: Db,
  redisClient: Redis | null,
): { worker: Worker; stop: () => Promise<void> } {
  const mechanicRepo = new MechanicRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const cacheService = new LeaderboardCacheService(redisClient)
  const playerRewardRepo = new PlayerRewardRepository(db)
  const rewardDefRepo = new RewardDefinitionRepository(db)
  const rewardExecQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection })

  const leaderboardService = new LeaderboardService(
    statsRepo,
    cacheService,
    playerRewardRepo,
    rewardDefRepo,
    rewardExecQueue,
  )

  const worker = new Worker(
    QUEUE_NAMES.LEADERBOARD_FINALIZE,
    async (job) => {
      const { campaignId } = job.data as { campaignId: string }
      console.log(`[LeaderboardFinalizer] Finalizing campaign: ${campaignId}`)

      const mechanics = await mechanicRepo.findByCampaignId(campaignId)
      const leaderboardMechanics = mechanics.filter(
        (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
      )

      for (const mechanic of leaderboardMechanics) {
        try {
          const config = mechanic.config as Record<string, unknown>
          if (mechanic.type === 'LEADERBOARD_LAYERED') {
            const lb1 = config.leaderboard_1 as unknown as Parameters<typeof leaderboardService.finalize>[2]
            const lb2 = config.leaderboard_2 as unknown as Parameters<typeof leaderboardService.finalize>[2]
            if (lb1) {
              await leaderboardService.finalize(mechanic.id, campaignId, lb1)
            }
            if (lb2) {
              await leaderboardService.finalize(mechanic.id, campaignId, lb2)
            }
          } else {
            await leaderboardService.finalize(
              mechanic.id,
              campaignId,
              config as unknown as Parameters<typeof leaderboardService.finalize>[2],
            )
          }
          console.log(`[LeaderboardFinalizer] Finalized mechanic ${mechanic.id}`)
        } catch (err) {
          console.error(`[LeaderboardFinalizer] Failed for mechanic ${mechanic.id}:`, err)
        }
      }
    },
    { connection, concurrency: 1 },
  )

  worker.on('ready', () => console.log('[LeaderboardFinalizer] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[LeaderboardFinalizer] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[LeaderboardFinalizer] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await rewardExecQueue.close()
    },
  }
}
