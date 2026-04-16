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
import { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import { AggregationService } from '../services/aggregation.service'
import type { AggregationRule } from '@promotionos/db'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

/** Reward types that should emit MECHANIC_OUTCOME events into the pipeline */
const OUTCOME_EMITTING_REWARDS: Record<string, (config: Record<string, unknown>) => number> = {
  VIRTUAL_COINS: (config) => Number(config.coins ?? config.amount ?? 1),
  CASH: (config) => Number(config.amount ?? 0),
  CASHBACK: (config) => Number(config.amount ?? 0),
  FREE_SPINS: (config) => Number(config.count ?? config.spins ?? 1),
  FREE_BET: (config) => Number(config.amount ?? 0),
}

/**
 * Emit a MECHANIC_OUTCOME event into the aggregation pipeline.
 * Finds all aggregation rules in the campaign that listen to MECHANIC_OUTCOME
 * and processes each one (writes stats to the mechanic that owns the rule).
 */
async function emitMechanicOutcome(
  aggRuleRepo: AggregationRuleRepository,
  aggregationService: AggregationService,
  playerId: string,
  campaignId: string,
  sourceMechanicId: string,
  rewardType: string,
  amount: number,
): Promise<void> {
  let rules: AggregationRule[]
  try {
    rules = await aggRuleRepo.findByCampaignAndEventType(
      campaignId,
      'MECHANIC_OUTCOME' as AggregationRule['sourceEventType'],
    )
  } catch (err) {
    console.error(`[RewardExecutor] MECHANIC_OUTCOME rule lookup failed for campaign ${campaignId}:`, err)
    return
  }

  console.log(`[RewardExecutor] Found ${rules.length} MECHANIC_OUTCOME rule(s) for campaign ${campaignId}`)
  if (rules.length === 0) return

  const now = new Date()
  const payload = {
    amount,
    rewardType,
    sourceMechanicId,
  }

  for (const rule of rules) {
    try {
      await aggregationService.processAggregationJob({
        rawEventId: `mechanic-outcome-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerId,
        campaignId,
        aggregationRuleId: rule.id,
        eventType: 'MECHANIC_OUTCOME',
        payload,
        occurredAt: now.toISOString(),
      })
      console.log(`[RewardExecutor] MECHANIC_OUTCOME aggregated for rule ${rule.id} (${rewardType}: ${amount})`)
    } catch (err) {
      console.warn(`[RewardExecutor] MECHANIC_OUTCOME aggregation failed for rule ${rule.id}:`, err)
    }
  }
}

export function startRewardExecutor(
  connection: Redis,
  db: Db,
): { worker: Worker; rewardQueue: Queue; stop: () => Promise<void> } {
  const gateway = new MockRewardGatewayService()
  const playerRewardRepo = new PlayerRewardRepository(db)
  const rewardDefRepo = new RewardDefinitionRepository(db)
  const executionRepo = new RewardExecutionRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const aggRuleRepo = new AggregationRuleRepository(db)
  const aggregationService = new AggregationService(aggRuleRepo, statsRepo)

  const rewardQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection })

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

      if (!playerReward || !rewardDef) return

      const config = rewardDef.config as Record<string, unknown>

      // EXTRA_SPIN: grant bonus spins to target wheel
      if (rewardDef.type === 'EXTRA_SPIN') {
        const targetMechanicId = config.target_mechanic_id as string | undefined
        const spinCount = Number(config.count ?? config.spins ?? 1)
        if (targetMechanicId) {
          for (let i = 0; i < spinCount; i++) {
            await statsRepo.upsertCount({
              playerId: playerReward.playerId,
              campaignId: playerReward.campaignId,
              mechanicId: targetMechanicId,
              metricType: 'bonus_spins',
              windowType: 'campaign',
              windowStart: new Date(0),
            })
          }
          console.log(`[RewardExecutor] Granted ${spinCount} bonus spin(s) to player ${playerReward.playerId} for mechanic ${targetMechanicId}`)
        }
      }

      // Emit MECHANIC_OUTCOME for reward types that carry a meaningful value
      const amountExtractor = OUTCOME_EMITTING_REWARDS[rewardDef.type]
      if (amountExtractor) {
        const amount = amountExtractor(config)
        console.log(`[RewardExecutor] ${rewardDef.type} amount=${amount} campaign=${playerReward.campaignId} mechanic=${playerReward.mechanicId}`)
        if (amount > 0) {
          await emitMechanicOutcome(
            aggRuleRepo,
            aggregationService,
            playerReward.playerId,
            playerReward.campaignId,
            playerReward.mechanicId,
            rewardDef.type,
            amount,
          )
        }
      } else {
        console.log(`[RewardExecutor] No outcome emitter for reward type: ${rewardDef.type}`)
      }
    },
    {
      connection,
      concurrency: 5,
      drainDelay: 30_000,
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
    rewardQueue,
    stop: async () => {
      await worker.close()
      await rewardQueue.close()
    },
  }
}
