import { Queue, Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { RawEventRepository } from '../repositories/raw-event.repository'
import { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { TriggerMatcherService } from '../services/trigger-matcher.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

const FALLBACK_SWEEP_INTERVAL_MS = 60_000
const FALLBACK_BATCH_SIZE = 100

export function startEventIngestor(
  connection: Redis,
  db: Db,
): { worker: Worker; stop: () => Promise<void> } {
  const rawEventRepo = new RawEventRepository(db)
  const aggRuleRepo = new AggregationRuleRepository(db)
  const campaignRepo = new CampaignSchedulerRepository(db)
  const mechanicRepo = new MechanicRepository(db)
  const triggerMatcher = new TriggerMatcherService(campaignRepo, aggRuleRepo)
  const aggregationQueue = new Queue(QUEUE_NAMES.AGGREGATION, { connection })
  const mechanicExecQueue = new Queue(QUEUE_NAMES.MECHANIC_EXECUTION, { connection })
  const mechanicEvalQueue = new Queue(QUEUE_NAMES.MECHANIC_EVALUATION, { connection })

  const worker = new Worker(
    QUEUE_NAMES.EVENT_INGESTION,
    async (job) => {
      const { rawEventId } = job.data as { rawEventId: string }
      await processEvent(
        rawEventId,
        rawEventRepo,
        triggerMatcher,
        mechanicRepo,
        aggregationQueue,
        mechanicExecQueue,
        mechanicEvalQueue,
      )
    },
    { connection, concurrency: 10 },
  )

  worker.on('ready', () => console.log('[EventIngestor] BullMQ consumer ready'))
  worker.on('failed', (job, err) =>
    console.error(`[EventIngestor] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[EventIngestor] Error:', err))

  let sweepRunning = true
  let sweepTimer: ReturnType<typeof setTimeout> | null = null

  async function fallbackSweep(): Promise<void> {
    if (!sweepRunning) return

    try {
      const events = await rawEventRepo.fetchUnprocessedBatch(FALLBACK_BATCH_SIZE)
      if (events.length > 0) {
        console.log(`[EventIngestor] Fallback sweep found ${events.length} unprocessed events`)
        for (const event of events) {
          await processEvent(
            event.id,
            rawEventRepo,
            triggerMatcher,
            mechanicRepo,
            aggregationQueue,
            mechanicExecQueue,
            mechanicEvalQueue,
          )
        }
      }
    } catch (err) {
      console.error('[EventIngestor] Fallback sweep error:', err)
    }

    if (sweepRunning) {
      sweepTimer = setTimeout(fallbackSweep, FALLBACK_SWEEP_INTERVAL_MS)
    }
  }

  sweepTimer = setTimeout(fallbackSweep, FALLBACK_SWEEP_INTERVAL_MS)
  console.log('[EventIngestor] Started (push-based + 60s fallback sweep)')

  return {
    worker,
    stop: async () => {
      sweepRunning = false
      if (sweepTimer) clearTimeout(sweepTimer)
      await worker.close()
      await aggregationQueue.close()
      await mechanicExecQueue.close()
      await mechanicEvalQueue.close()
    },
  }
}

async function processEvent(
  rawEventId: string,
  rawEventRepo: RawEventRepository,
  triggerMatcher: TriggerMatcherService,
  mechanicRepo: MechanicRepository,
  aggregationQueue: Queue,
  mechanicExecQueue: Queue,
  mechanicEvalQueue: Queue,
): Promise<void> {
  const event = await rawEventRepo.findById(rawEventId)
  if (!event || event.processed) return

  const matchedRules = await triggerMatcher.findMatchingRules(
    event.eventType,
    event.payload as Record<string, unknown>,
  )

  const aggJobs = matchedRules.map((match) => ({
    name: 'aggregate',
    data: {
      rawEventId: event.id,
      playerId: event.playerId,
      campaignId: match.campaignId,
      aggregationRuleId: match.aggregationRule.id,
      eventType: event.eventType,
      payload: event.payload,
      occurredAt: event.occurredAt.toISOString(),
    },
  }))

  if (aggJobs.length > 0) {
    await aggregationQueue.addBulk(aggJobs)
  }

  const processedCampaigns = new Set(matchedRules.map((m) => m.campaignId))
  for (const campaignId of processedCampaigns) {
    await fanOutMechanicJobs(
      mechanicRepo,
      mechanicExecQueue,
      mechanicEvalQueue,
      campaignId,
      event.playerId,
    )
  }

  await rawEventRepo.markProcessed(event.id)
}

async function fanOutMechanicJobs(
  mechanicRepo: MechanicRepository,
  mechanicExecQueue: Queue,
  mechanicEvalQueue: Queue,
  campaignId: string,
  playerId: string,
): Promise<void> {
  const mechanics = await mechanicRepo.findByCampaignId(campaignId)

  for (const mechanic of mechanics) {
    if (!mechanic.isActive) continue

    const config = mechanic.config as Record<string, unknown>

    if (
      (mechanic.type === 'WHEEL' || mechanic.type === 'WHEEL_IN_WHEEL') &&
      config.spin_trigger === 'automatic'
    ) {
      await mechanicExecQueue.add('auto-spin', {
        mechanicId: mechanic.id,
        playerId,
        action: { type: 'auto-spin' },
      })
    }

    if (
      mechanic.type === 'MISSION' ||
      mechanic.type === 'PROGRESS_BAR' ||
      mechanic.type === 'WHEEL_IN_WHEEL'
    ) {
      await mechanicEvalQueue.add('re-evaluate', {
        mechanicId: mechanic.id,
        playerId,
      })
    }
  }
}
