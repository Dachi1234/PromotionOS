import { Worker, Queue } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { RewardExecutionService } from '../services/reward-execution.service'
import { MockRewardGatewayService } from '../services/gateways/mock-reward-gateway'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import { RewardExecutionRepository } from '../repositories/reward-execution.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export function startRewardExecutor(
  connection: Redis,
  db: Db,
): { worker: Worker; stop: () => Promise<void> } {
  const gateway = new MockRewardGatewayService()
  const playerRewardRepo = new PlayerRewardRepository(db)
  const rewardDefRepo = new RewardDefinitionRepository(db)
  const executionRepo = new RewardExecutionRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const mechanicExecQueue = new Queue(QUEUE_NAMES.MECHANIC_EXECUTION, { connection })

  const rewardExecService = new RewardExecutionService(
    gateway,
    playerRewardRepo,
    rewardDefRepo,
    executionRepo,
    statsRepo,
  )

  const worker = new Worker(
    QUEUE_NAMES.REWARD_EXECUTION,
    async (job) => {
      const { playerRewardId } = job.data as { playerRewardId: string }
      console.log(`[RewardExecutor] Processing reward: ${playerRewardId}`)

      await rewardExecService.execute(playerRewardId)

      const playerReward = await playerRewardRepo.findById(playerRewardId)
      const rewardDef = playerReward
        ? await rewardDefRepo.findById(playerReward.rewardDefinitionId)
        : null

      if (rewardDef?.type === 'EXTRA_SPIN') {
        const config = rewardDef.config as Record<string, unknown>
        const targetMechanicId = config.target_mechanic_id as string | undefined
        if (targetMechanicId && playerReward) {
          await mechanicExecQueue.add('auto-spin', {
            mechanicId: targetMechanicId,
            playerId: playerReward.playerId,
            action: { type: 'auto-spin' },
          })
        }
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 50, duration: 1000 },
    },
  )

  worker.on('ready', () => console.log('[RewardExecutor] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[RewardExecutor] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[RewardExecutor] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await mechanicExecQueue.close()
    },
  }
}
