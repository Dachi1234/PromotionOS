import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { PlayerMechanicStateRepository } from '../repositories/player-mechanic-state.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { ConditionProgressCheckerService } from '../services/mechanics/condition-progress-checker.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

const EXPIRY_CHECK_QUEUE = 'condition-expiry-scheduler'

export function startConditionExpiryChecker(
  connection: Redis,
  db: Db,
): { worker: Worker; stop: () => Promise<void> } {
  const playerRewardRepo = new PlayerRewardRepository(db)
  const stateRepo = new PlayerMechanicStateRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const rewardExecQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection })

  const conditionChecker = new ConditionProgressCheckerService(
    playerRewardRepo,
    statsRepo,
    rewardExecQueue,
  )

  const schedulerQueue = new Queue(EXPIRY_CHECK_QUEUE, { connection })

  schedulerQueue.add('check-expiry', {}, {
    repeat: { every: 300_000 },
    removeOnComplete: 10,
    removeOnFail: 10,
  })

  const worker = new Worker(
    EXPIRY_CHECK_QUEUE,
    async () => {
      try {
        const pendingRewards = await playerRewardRepo.findExpiredConditionPending()
        const now = new Date()

        for (const reward of pendingRewards) {
          const snapshot = reward.conditionSnapshot as {
            expires_at?: string
            on_failure?: string
            time_limit_hours?: number
          } | null

          if (!snapshot?.expires_at) continue

          if (new Date(snapshot.expires_at) > now) continue

          await conditionChecker.handleExpiry(reward.id, snapshot as Parameters<typeof conditionChecker.handleExpiry>[1])
        }

        await checkMissionStepExpiry(stateRepo, db)
      } catch (err) {
        console.error('[ConditionExpiryChecker] Error:', err)
      }
    },
    { connection, concurrency: 1, drainDelay: 30_000 },
  )

  worker.on('ready', () => console.log('[ConditionExpiryChecker] Ready'))
  worker.on('error', (err) => console.error('[ConditionExpiryChecker] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await schedulerQueue.close()
      await rewardExecQueue.close()
    },
  }
}

async function checkMissionStepExpiry(
  stateRepo: PlayerMechanicStateRepository,
  _db: Db,
): Promise<void> {
  // Mission step expiry is checked during mission evaluation (re-evaluate action).
  // The condition-expiry-checker focuses on condition_pending player_rewards.
  // Mission steps with expired time windows are handled when MissionService.evaluateProgress() runs.
}
