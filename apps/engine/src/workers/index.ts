import type { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { startRewardExecutor } from './reward-executor'
import { startSimpleSchedulers, type SimpleSchedulerRegistry } from './simple-schedulers'

type Db = PostgresJsDatabase<typeof schema>

export interface WorkerRegistry {
  rewardExecutor: { worker: Worker; stop: () => Promise<void> }
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
  redisClient: Redis | null = null,
): WorkerRegistry {
  const rewardExecutor = startRewardExecutor(connection, db)
  const schedulers = startSimpleSchedulers(db, redisClient, rewardExecutor.rewardQueue)

  registry = { rewardExecutor, schedulers }

  console.log('[Workers] Started: 1 BullMQ worker (reward-executor) + 5 timer-based schedulers')
  return registry
}

export async function stopAllWorkers(): Promise<void> {
  if (!registry) return
  registry.schedulers.stop()
  await registry.rewardExecutor.stop()
  registry = null
  console.log('[Workers] All workers stopped')
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
