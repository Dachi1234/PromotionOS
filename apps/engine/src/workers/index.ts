import type { Worker, Queue } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { FastifyBaseLogger } from 'fastify'
import type * as schema from '@promotionos/db'
import { startRewardExecutor } from './reward-executor'
import { startSimpleSchedulers, type SimpleSchedulerRegistry } from './simple-schedulers'

type Db = PostgresJsDatabase<typeof schema>

export interface WorkerRegistry {
  // `rewardQueue` is used by admin routes (e.g. leaderboard finalize) to
  // enqueue reward-execution jobs without going through the worker path.
  // Keep it exposed on the registry shape so `server.ts` can reach it.
  rewardExecutor: { worker: Worker; rewardQueue: Queue; stop: () => Promise<void> }
  schedulers: SimpleSchedulerRegistry
}

export interface WorkerStatus {
  name: string
  status: 'active' | 'inactive' | 'disabled'
}

let registry: WorkerRegistry | null = null

export function startAllWorkers(
  connection: Redis,
  db: Db,
  log: FastifyBaseLogger,
  redisClient: Redis | null = null,
): WorkerRegistry {
  const rewardExecutor = startRewardExecutor(connection, db, log)
  const schedulers = startSimpleSchedulers(db, redisClient, rewardExecutor.rewardQueue)

  registry = { rewardExecutor, schedulers }

  log.info(
    { workerCount: 1, schedulerCount: 5 },
    'Workers started: reward-executor BullMQ worker + timer-based schedulers',
  )
  return registry
}

export async function stopAllWorkers(log?: FastifyBaseLogger): Promise<void> {
  if (!registry) return
  registry.schedulers.stop()
  await registry.rewardExecutor.stop()
  registry = null
  log?.info('All workers stopped')
}

const ALL_WORKER_NAMES = [
  'reward-executor',
  'campaign-scheduler',
  'leaderboard-refresher',
  'leaderboard-window-finalizer',
  'condition-expiry-checker',
  'window-recalculator',
] as const

export function getWorkerStatuses(redisAvailable: boolean): WorkerStatus[] {
  const enabled = process.env.ENABLE_WORKERS === 'true'
  if (!enabled) return ALL_WORKER_NAMES.map((name) => ({ name, status: 'disabled' as const }))
  if (!redisAvailable || !registry) return ALL_WORKER_NAMES.map((name) => ({ name, status: 'inactive' as const }))
  return ALL_WORKER_NAMES.map((name) => ({ name, status: 'active' as const }))
}
