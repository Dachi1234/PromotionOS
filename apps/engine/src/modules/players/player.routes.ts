import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  createPlayerSchema,
  listPlayersQuerySchema,
} from './player.schema'
import { PlayerRepository } from './player.repository'
import { PlayerService } from './player.service'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'

type IdParam = { Params: { id: string } }

function handleError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      success: false,
      error: { code: err.code, message: err.message },
    })
  }
  throw err
}

export async function playerRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new PlayerRepository(fastify.db)
  const service = new PlayerService(repository)

  // POST /api/v1/admin/players
  fastify.post(
    '/api/v1/admin/players',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = createPlayerSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const player = await service.createPlayer(parsed.data)
        return reply.code(201).send({ success: true, data: { player } })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/players
  fastify.get(
    '/api/v1/admin/players',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = listPlayersQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.listPlayers(parsed.data)
        return reply.send({
          success: true,
          data: { players: result.players },
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

  // POST /api/v1/admin/players/:id/session
  fastify.post<IdParam>(
    '/api/v1/admin/players/:id/session',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const session = await service.createSession(request.params.id)
        return reply.code(201).send({ success: true, data: session })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )
}
