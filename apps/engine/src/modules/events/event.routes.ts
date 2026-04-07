import { Queue } from 'bullmq'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { ingestEventSchema, listEventsQuerySchema } from './event.schema'
import { EventRepository } from './event.repository'
import { EventService } from './event.service'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'
import { QUEUE_NAMES } from '../../lib/queue'

function handleError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message },
    })
  }
  throw err
}

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new EventRepository(fastify.db)

  let ingestionQueue: Queue | null = null
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const { Redis } = await import('ioredis')
      const conn = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
      ingestionQueue = new Queue(QUEUE_NAMES.EVENT_INGESTION, { connection: conn })
    }
  } catch {
    console.warn('[EventRoutes] Could not create ingestion queue — events will rely on fallback sweep')
  }

  const service = new EventService(repository, ingestionQueue)

  fastify.addHook('onClose', async () => {
    await ingestionQueue?.close()
  })

  // POST /api/v1/events/ingest — NO AUTH
  fastify.post(
    '/api/v1/events/ingest',
    async (request, reply) => {
      const parsed = ingestEventSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.ingestEvent(parsed.data)
        return reply.code(201).send({ success: true, data: result })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/events — JWT required
  fastify.get(
    '/api/v1/admin/events',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = listEventsQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.listEvents({
          playerId: parsed.data.playerId,
          eventType: parsed.data.eventType,
          processed: parsed.data.processed,
          page: parsed.data.page,
          limit: parsed.data.limit,
        })
        return reply.send({
          success: true,
          data: { events: result.events },
          meta: {
            page: parsed.data.page,
            limit: parsed.data.limit,
            total: result.total,
          },
        })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )
}
