import { Queue, Worker } from 'bullmq'
import type { Processor, WorkerOptions } from 'bullmq'
import type { Redis } from 'ioredis'

export const QUEUE_NAMES = {
  EVENT_INGESTION: 'event-ingestion',
  AGGREGATION: 'aggregation',
  CAMPAIGN_LIFECYCLE: 'campaign-lifecycle',
  REWARD_EXECUTION: 'reward-execution',
  LEADERBOARD_REFRESH: 'leaderboard-refresh',
  LEADERBOARD_FINALIZE: 'leaderboard-finalize',
  MECHANIC_EXECUTION: 'mechanic-execution',
  MECHANIC_EVALUATION: 'mechanic-evaluation',
  CONDITION_EXPIRY: 'condition-expiry',
} as const

export function createQueue(name: string, connection: Redis): Queue {
  return new Queue(name, { connection })
}

export function createWorker(
  name: string,
  processor: Processor,
  connection: Redis,
  opts?: Partial<WorkerOptions>,
): Worker {
  return new Worker(name, processor, {
    connection,
    ...opts,
  })
}
