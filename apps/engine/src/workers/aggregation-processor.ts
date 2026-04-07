import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { AggregationService } from '../services/aggregation.service'
import type { AggregationJobPayload } from '../services/aggregation.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export function startAggregationProcessor(
  connection: Redis,
  db: Db,
): Worker {
  const aggRuleRepo = new AggregationRuleRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const aggregationService = new AggregationService(aggRuleRepo, statsRepo)

  const worker = new Worker(
    QUEUE_NAMES.AGGREGATION,
    async (job) => {
      const payload = job.data as AggregationJobPayload
      await aggregationService.processAggregationJob(payload)
    },
    {
      connection,
      concurrency: 10,
    },
  )

  worker.on('ready', () => {
    console.log('[AggregationProcessor] Ready')
  })

  worker.on('completed', (job) => {
    console.log(`[AggregationProcessor] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[AggregationProcessor] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[AggregationProcessor] Error:', err)
  })

  return worker
}
