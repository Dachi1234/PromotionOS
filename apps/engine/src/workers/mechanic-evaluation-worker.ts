import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { createMechanicServices } from './mechanic-factory'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export function startMechanicEvaluationWorker(
  connection: Redis,
  db: Db,
  redisClient: Redis | null,
): { worker: Worker; stop: () => Promise<void> } {
  const mechanicRepo = new MechanicRepository(db)
  const services = createMechanicServices(connection, db, redisClient)

  const worker = new Worker(
    QUEUE_NAMES.MECHANIC_EVALUATION,
    async (job) => {
      const { mechanicId, playerId } = job.data as {
        mechanicId: string
        playerId: string
      }

      console.log(`[MechanicEvaluation] Re-evaluating mechanic=${mechanicId} player=${playerId}`)

      const mechanic = await mechanicRepo.findById(mechanicId)
      if (!mechanic) {
        console.warn(`[MechanicEvaluation] Mechanic ${mechanicId} not found`)
        return
      }

      switch (mechanic.type) {
        case 'MISSION':
          await services.missionService.evaluateProgress(playerId, mechanic)
          break
        case 'PROGRESS_BAR':
          await services.progressBarService.evaluateAndAutoGrant(playerId, mechanic)
          break
        case 'WHEEL_IN_WHEEL':
          await services.conditionCheckerService.checkForPlayer(playerId, mechanic.campaignId)
          break
        default:
          console.log(`[MechanicEvaluation] No evaluation needed for type=${mechanic.type}`)
      }
    },
    { connection, concurrency: 10 },
  )

  worker.on('ready', () => console.log('[MechanicEvaluation] Ready'))
  worker.on('failed', (job, err) =>
    console.error(`[MechanicEvaluation] Job ${job?.id} failed:`, err.message),
  )
  worker.on('error', (err) => console.error('[MechanicEvaluation] Error:', err))

  return {
    worker,
    stop: async () => {
      await worker.close()
      services.cleanup()
    },
  }
}
