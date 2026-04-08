import { Queue, Worker } from 'bullmq'
import type { Processor, WorkerOptions } from 'bullmq'
import type { Redis } from 'ioredis'

export const QUEUE_NAMES = {
  REWARD_EXECUTION: 'reward-execution',
} as const

export function createQueue(name: string, connection: Redis): Queue {
  return new Queue(name, { connection })
}

const DEFAULT_DRAIN_DELAY_MS = 30_000

export function createWorker(
  name: string,
  processor: Processor,
  connection: Redis,
  opts?: Partial<WorkerOptions>,
): Worker {
  return new Worker(name, processor, {
    connection,
    drainDelay: DEFAULT_DRAIN_DELAY_MS,
    ...opts,
  })
}

export { DEFAULT_DRAIN_DELAY_MS }
