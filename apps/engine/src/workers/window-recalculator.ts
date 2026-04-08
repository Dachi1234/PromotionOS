import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import { RawEventRepository } from '../repositories/raw-event.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import type { TransformationConfig } from '@promotionos/types'
import { applyTransformationChain, extractValueFromPayload } from '../services/transformation-evaluator.service'
import { calculateWindowBounds } from '../services/window-calculator.service'

type Db = PostgresJsDatabase<typeof schema>

const RECALC_QUEUE = 'window-recalculator'

interface RecalcJob {
  windowType: string
}

export function startWindowRecalculator(
  connection: Redis,
  db: Db,
): { worker: Worker; stop: () => Promise<void> } {
  const aggRuleRepo = new AggregationRuleRepository(db)
  const rawEventRepo = new RawEventRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const queue = new Queue(RECALC_QUEUE, { connection })

  setupRepeatableJobs(queue)

  const worker = new Worker(
    RECALC_QUEUE,
    async (job) => {
      const { windowType } = job.data as RecalcJob
      await recalculate(windowType, aggRuleRepo, rawEventRepo, statsRepo)
    },
    { connection, concurrency: 1, drainDelay: 30_000 },
  )

  worker.on('ready', () => console.log('[WindowRecalculator] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[WindowRecalculator] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[WindowRecalculator] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      await queue.close()
    },
  }
}

async function setupRepeatableJobs(queue: Queue): Promise<void> {
  await queue.add('recalc-minute', { windowType: 'minute' }, {
    repeat: { every: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  })
  await queue.add('recalc-hourly', { windowType: 'hourly' }, {
    repeat: { every: 60 * 60_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  })
  await queue.add('recalc-daily', { windowType: 'daily' }, {
    repeat: { every: 60 * 60_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  })
  await queue.add('recalc-weekly', { windowType: 'weekly' }, {
    repeat: { every: 60 * 60_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  })
}

async function recalculate(
  windowType: string,
  aggRuleRepo: AggregationRuleRepository,
  rawEventRepo: RawEventRepository,
  statsRepo: PlayerCampaignStatsRepository,
): Promise<void> {
  const castWindowType = windowType as 'minute' | 'hourly' | 'daily' | 'weekly' | 'campaign' | 'rolling'
  const rules = await aggRuleRepo.findActiveRulesByWindowType(castWindowType)

  if (rules.length === 0) return

  const now = new Date()

  for (const rule of rules) {
    try {
      const window = calculateWindowBounds(
        rule.windowType,
        now,
        rule.campaignStartsAt,
        rule.campaignEndsAt,
        rule.windowSizeHours,
      )

      const events = await rawEventRepo.fetchEventsInWindow(
        '',
        rule.sourceEventType,
        window.windowStart,
        window.windowEnd,
      )

      const playerAggs = new Map<string, { sum: number; count: number }>()

      for (const event of events) {
        const payload = event.payload as Record<string, unknown>
        const transformation = rule.transformation as TransformationConfig | TransformationConfig[]
        const field = Array.isArray(transformation) ? transformation[0]?.field : transformation.field
        const rawValue = extractValueFromPayload(payload, field)
        const { transformedValue } = applyTransformationChain(rawValue, transformation)

        const existing = playerAggs.get(event.playerId) ?? { sum: 0, count: 0 }
        existing.sum += transformedValue
        existing.count += 1
        playerAggs.set(event.playerId, existing)
      }

      for (const [playerId, agg] of playerAggs) {
        let finalValue: number
        switch (rule.metric) {
          case 'COUNT':
            finalValue = agg.count
            break
          case 'SUM':
            finalValue = agg.sum
            break
          case 'AVERAGE':
            finalValue = agg.count > 0 ? agg.sum / agg.count : 0
            break
          default:
            continue
        }

        await statsRepo.setAbsolute({
          playerId,
          campaignId: rule.campaignId,
          mechanicId: rule.mechanicId,
          metricType: rule.metric,
          windowType: castWindowType,
          windowStart: window.windowStart,
          value: finalValue,
          sampleCount: agg.count,
        })
      }
    } catch (err) {
      console.error(`[WindowRecalculator] Failed for rule ${rule.id}:`, err)
    }
  }
}
