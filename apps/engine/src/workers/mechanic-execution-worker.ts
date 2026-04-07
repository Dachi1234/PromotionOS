import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import type { MechanicAction } from '@promotionos/types'
import { MechanicExecutorService } from '../services/mechanics/mechanic-executor.service'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { createMechanicServices } from './mechanic-factory'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export function startMechanicExecutionWorker(
  connection: Redis,
  db: Db,
  redisClient: Redis | null,
): { worker: Worker; stop: () => Promise<void> } {
  const mechanicRepo = new MechanicRepository(db)
  const services = createMechanicServices(connection, db, redisClient)

  const executorService = new MechanicExecutorService(
    mechanicRepo,
    services.wheelService,
    services.wheelInWheelService,
    services.leaderboardService,
    services.leaderboardLayeredService,
    services.missionService,
    services.progressBarService,
    services.cashoutService,
  )

  const worker = new Worker(
    QUEUE_NAMES.MECHANIC_EXECUTION,
    async (job) => {
      const data = job.data as {
        mechanicId: string
        playerId: string
        action: { type: string; stepId?: string; page?: number; pageSize?: number }
      }

      console.log(`[MechanicExecution] Executing ${data.action.type} for mechanic=${data.mechanicId} player=${data.playerId}`)
      await executorService.execute(data.mechanicId, data.playerId, data.action as MechanicAction)
    },
    { connection, concurrency: 10 },
  )

  worker.on('ready', () => console.log('[MechanicExecution] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[MechanicExecution] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[MechanicExecution] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      services.cleanup()
    },
  }
}
