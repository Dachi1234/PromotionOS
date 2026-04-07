import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import { LeaderboardService } from '../services/mechanics/leaderboard.service'
import { LeaderboardCacheService } from '../services/mechanics/leaderboard-cache.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

const REFRESH_QUEUE = 'leaderboard-refresh-scheduler'

export function startLeaderboardRefresher(
  connection: Redis,
  db: Db,
  redisClient: Redis | null,
): { worker: Worker; stop: () => Promise<void> } {
  const campaignRepo = new CampaignSchedulerRepository(db)
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

  const schedulerQueue = new Queue(REFRESH_QUEUE, { connection })

  schedulerQueue.add('refresh-all', {}, {
    repeat: { every: 30_000 },
    removeOnComplete: 10,
    removeOnFail: 10,
  })

  const worker = new Worker(
    REFRESH_QUEUE,
    async () => {
      try {
        const activeCampaigns = await campaignRepo.findActiveCampaigns()

        for (const campaign of activeCampaigns) {
          const mechanics = await mechanicRepo.findByCampaignId(campaign.id)
          const leaderboardMechanics = mechanics.filter(
            (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
          )

          for (const mechanic of leaderboardMechanics) {
            try {
              const config = mechanic.config as Record<string, unknown>
              if (!config?.window_type || !config?.ranking_metric) {
                continue
              }
              await leaderboardService.refreshCache(
                mechanic.id,
                campaign.id,
                config as unknown as Parameters<typeof leaderboardService.refreshCache>[2],
              )
            } catch (err) {
              console.error(`[LeaderboardRefresher] Failed for mechanic ${mechanic.id}:`, err)
            }
          }
        }
      } catch (err) {
        console.error('[LeaderboardRefresher] Poll error:', err)
      }
    },
    { connection, concurrency: 1 },
  )

  worker.on('ready', () => console.log('[LeaderboardRefresher] Ready'))
  worker.on('error', (err) => console.error('[LeaderboardRefresher] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await schedulerQueue.close()
      await rewardExecQueue.close()
    },
  }
}
