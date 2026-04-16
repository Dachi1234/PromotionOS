import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignStatusTransitionSchema,
  listCampaignsQuerySchema,
} from './campaign.schema'
import { CampaignRepository } from './campaign.repository'
import { CampaignService, classifyCampaignPatch } from './campaign.service'
import { AppError } from '../../lib/errors'
import { requireAdmin } from '../../lib/jwt-user'
import { writeAuditLog } from '../../routes/admin/audit-log.routes'
import {
  canEdit,
  type CampaignStatus,
} from '../editability/editability.policy'
import { recordEdit } from '../audit/audit.service'

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
        await recordEdit(fastify.db, fastify.log, {
          campaignId: campaign.id,
          campaignStatusAtEdit: campaign.status as CampaignStatus,
          actorUserId: createdBy,
          action: { kind: 'structural', actionId: 'campaign.create' },
          entityType: 'campaign',
          entityId: campaign.id,
          patchSnapshot: parsed.data,
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
        await recordEdit(fastify.db, fastify.log, {
          campaignId: request.params.id,
          campaignStatusAtEdit: campaign.status as CampaignStatus,
          actorUserId: request.user.sub,
          action: classifyCampaignPatch(parsed.data),
          entityType: 'campaign',
          entityId: request.params.id,
          patchSnapshot: parsed.data,
        })
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
        // Status transitions are always structural — they affect every
        // downstream gate. Logged with a distinct actionId so they're
        // easy to audit separately from content edits.
        await recordEdit(fastify.db, fastify.log, {
          campaignId: request.params.id,
          campaignStatusAtEdit: campaign.status as CampaignStatus,
          actorUserId: request.user.sub,
          action: { kind: 'structural', actionId: 'campaign.status.transition' },
          entityType: 'campaign',
          entityId: request.params.id,
          patchSnapshot: { status: parsed.data.status },
        })
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
        // Pre-read status so we can audit the pre-delete state. Audit row
        // must also be written before the delete commits — the FK from
        // `campaign_audit_log.campaign_id` → `campaigns(id)` would block
        // a post-delete insert. Status is read from the repository to
        // avoid duplicating the not-found check here.
        const pre = await repository.findById(request.params.id)
        if (pre) {
          await recordEdit(fastify.db, fastify.log, {
            campaignId: pre.id,
            campaignStatusAtEdit: pre.status as CampaignStatus,
            actorUserId: request.user.sub,
            action: { kind: 'structural', actionId: 'campaign.delete' },
            entityType: 'campaign',
            entityId: pre.id,
          })
        }
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

  // GET /api/v1/admin/campaigns/:id/editability
  // Returns a machine-readable summary of what kinds of edits are
  // currently allowed for this campaign. The studio UI uses this to
  // grey out buttons rather than letting the operator attempt an edit
  // and get a 409 back. Keep this contract stable — UI depends on the
  // exact shape.
  fastify.get<IdParam>(
    '/api/v1/admin/campaigns/:id/editability',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const campaign = await repository.findById(request.params.id)
        if (!campaign) {
          throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
        }
        const status = campaign.status as CampaignStatus
        return reply.send({
          success: true,
          data: {
            status,
            canEdit: {
              structural: canEdit(status, 'structural'),
              tweak: canEdit(status, 'tweak'),
            },
          },
        })
      } catch (err) {
        return handleError(reply, err)
      }
    },
  )
}
