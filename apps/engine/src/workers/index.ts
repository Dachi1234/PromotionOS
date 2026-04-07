import type { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { startEventIngestor } from './event-ingestor'
import { startAggregationProcessor } from './aggregation-processor'
import { startWindowRecalculator } from './window-recalculator'
import { startCampaignScheduler } from './campaign-scheduler'
import { startRewardExecutor } from './reward-executor'
import { startLeaderboardRefresher } from './leaderboard-refresher'
import { startLeaderboardFinalizer } from './leaderboard-finalizer'
import { startConditionExpiryChecker } from './condition-expiry-checker'
import { startMechanicExecutionWorker } from './mechanic-execution-worker'
import { startMechanicEvaluationWorker } from './mechanic-evaluation-worker'

type Db = PostgresJsDatabase<typeof schema>

export interface WorkerRegistry {
  eventIngestor: { worker: Worker; stop: () => Promise<void> }
  aggregationProcessor: Worker
  windowRecalculator: { worker: Worker; stop: () => Promise<void> }
  campaignScheduler: { worker: Worker; stop: () => Promise<void> }
  rewardExecutor: { worker: Worker; stop: () => Promise<void> }
  leaderboardRefresher: { worker: Worker; stop: () => Promise<void> }
  leaderboardFinalizer: { worker: Worker; stop: () => Promise<void> }
  conditionExpiryChecker: { worker: Worker; stop: () => Promise<void> }
  mechanicExecution: { worker: Worker; stop: () => Promise<void> }
  mechanicEvaluation: { worker: Worker; stop: () => Promise<void> }
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
  const eventIngestor = startEventIngestor(connection, db)
  const aggregationProcessor = startAggregationProcessor(connection, db)
  const windowRecalculator = startWindowRecalculator(connection, db)
  const campaignScheduler = startCampaignScheduler(connection, db)
  const rewardExecutor = startRewardExecutor(connection, db)
  const leaderboardRefresher = startLeaderboardRefresher(connection, db, redisClient)
  const leaderboardFinalizer = startLeaderboardFinalizer(connection, db, redisClient)
  const conditionExpiryChecker = startConditionExpiryChecker(connection, db)
  const mechanicExecution = startMechanicExecutionWorker(connection, db, redisClient)
  const mechanicEvaluation = startMechanicEvaluationWorker(connection, db, redisClient)

  registry = {
    eventIngestor,
    aggregationProcessor,
    windowRecalculator,
    campaignScheduler,
    rewardExecutor,
    leaderboardRefresher,
    leaderboardFinalizer,
    conditionExpiryChecker,
    mechanicExecution,
    mechanicEvaluation,
  }

  console.log('[Workers] All workers started (Phase 3)')
  return registry
}

export async function stopAllWorkers(): Promise<void> {
  if (!registry) return

  await registry.eventIngestor.stop()
  await registry.aggregationProcessor.close()
  await registry.windowRecalculator.stop()
  await registry.campaignScheduler.stop()
  await registry.rewardExecutor.stop()
  await registry.leaderboardRefresher.stop()
  await registry.leaderboardFinalizer.stop()
  await registry.conditionExpiryChecker.stop()
  await registry.mechanicExecution.stop()
  await registry.mechanicEvaluation.stop()

  registry = null
  console.log('[Workers] All workers stopped')
}

const ALL_WORKER_NAMES = [
  'event-ingestor',
  'aggregation-processor',
  'window-recalculator',
  'campaign-scheduler',
  'reward-executor',
  'leaderboard-refresher',
  'leaderboard-finalizer',
  'condition-expiry-checker',
  'mechanic-execution',
  'mechanic-evaluation',
] as const

export function getWorkerStatuses(redisAvailable: boolean): WorkerStatus[] {
  const enabled = process.env.ENABLE_WORKERS === 'true'

  if (!enabled) {
    return ALL_WORKER_NAMES.map((name) => ({ name, status: 'disabled' as const }))
  }

  if (!redisAvailable || !registry) {
    return ALL_WORKER_NAMES.map((name) => ({ name, status: 'inactive' as const }))
  }

  return ALL_WORKER_NAMES.map((name) => ({ name, status: 'active' as const }))
}
