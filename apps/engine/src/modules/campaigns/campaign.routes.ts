import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignStatusTransitionSchema,
  listCampaignsQuerySchema,
} from './campaign.schema'
import { CampaignRepository } from './campaign.repository'
import { CampaignService } from './campaign.service'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'
import { writeAuditLog } from '../../routes/admin/audit-log.routes'

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

export async function campaignRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new CampaignRepository(fastify.db)
  const service = new CampaignService(repository)

  // POST /api/v1/admin/campaigns
  fastify.post(
    '/api/v1/admin/campaigns',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = createCampaignSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const createdBy = request.user.sub
        const campaign = await service.createCampaign(parsed.data, createdBy)
        await writeAuditLog(fastify.db, createdBy, 'campaign', campaign.id, 'created', {
          name: campaign.name,
        })
        return reply.code(201).send({ success: true, data: { campaign } })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/campaigns
  fastify.get(
    '/api/v1/admin/campaigns',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = listCampaignsQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const result = await service.getCampaigns(parsed.data)
        return reply.send({
          success: true,
          data: { campaigns: result.campaigns },
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

  // GET /api/v1/admin/campaigns/:id
  fastify.get<IdParam>(
    '/api/v1/admin/campaigns/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const result = await service.getCampaignById(request.params.id)
        return reply.send({ success: true, data: result })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // PATCH /api/v1/admin/campaigns/:id
  fastify.patch<IdParam>(
    '/api/v1/admin/campaigns/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = updateCampaignSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const campaign = await service.updateCampaign(
          request.params.id,
          parsed.data,
        )
        await writeAuditLog(
          fastify.db,
          request.user.sub,
          'campaign',
          request.params.id,
          'updated',
          parsed.data,
        )
        return reply.send({ success: true, data: { campaign } })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // PATCH /api/v1/admin/campaigns/:id/status
  fastify.patch<IdParam>(
    '/api/v1/admin/campaigns/:id/status',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = campaignStatusTransitionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      try {
        const campaign = await service.transitionStatus(
          request.params.id,
          parsed.data.status,
        )
        await writeAuditLog(
          fastify.db,
          request.user.sub,
          'campaign',
          request.params.id,
          'status_changed',
          { status: parsed.data.status },
        )
        return reply.send({ success: true, data: { campaign } })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )

  // DELETE /api/v1/admin/campaigns/:id
  fastify.delete<IdParam>(
    '/api/v1/admin/campaigns/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const result = await service.deleteCampaign(request.params.id)
        await writeAuditLog(
          fastify.db,
          request.user.sub,
          'campaign',
          request.params.id,
          'deleted',
        )
        return reply.send({ success: true, data: result })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )
}
