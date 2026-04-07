import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { campaigns } from '@promotionos/db'
import { requireAdmin } from '../../lib/jwt-user'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'

const idParamsSchema = z.object({ id: z.string().uuid() })

export async function canvasConfigRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/admin/campaigns/:id/canvas-config',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      try {
        const params = idParamsSchema.safeParse(request.params)
        if (!params.success) return sendError(reply, 'VALIDATION_ERROR', params.error.message)
        const { id } = params.data

        const [campaign] = await fastify.db
          .select({
            canvasConfig: campaigns.canvasConfig,
            updatedAt: campaigns.updatedAt,
            status: campaigns.status,
          })
          .from(campaigns)
          .where(eq(campaigns.id, id))
          .limit(1)

        if (!campaign) return sendError(reply, 'NOT_FOUND', 'Campaign not found', 404)

        return sendSuccess(reply, {
          canvasConfig: campaign.canvasConfig ?? null,
          version: campaign.updatedAt.toISOString(),
          status: campaign.status,
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  fastify.put(
    '/api/v1/admin/campaigns/:id/canvas-config',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      try {
        const params = idParamsSchema.safeParse(request.params)
        if (!params.success) return sendError(reply, 'VALIDATION_ERROR', params.error.message)
        const { id } = params.data
        const body = request.body as { canvasConfig: unknown; baseVersion?: string }

        const [campaign] = await fastify.db
          .select({
            id: campaigns.id,
            status: campaigns.status,
            updatedAt: campaigns.updatedAt,
          })
          .from(campaigns)
          .where(eq(campaigns.id, id))
          .limit(1)

        if (!campaign) return sendError(reply, 'NOT_FOUND', 'Campaign not found', 404)

        if (campaign.status === 'archived') {
          return sendError(reply, 'VALIDATION_ERROR', 'Canvas cannot be edited for archived campaigns', 400)
        }

        if (body.baseVersion) {
          const baseDate = new Date(body.baseVersion)
          if (campaign.updatedAt > baseDate) {
            return reply.code(409).send({
              success: false,
              error: {
                code: 'CONFLICT',
                message: 'Someone else has edited this campaign. Reload to see their changes.',
                serverVersion: campaign.updatedAt.toISOString(),
              },
            })
          }
        }

        const now = new Date()
        await fastify.db
          .update(campaigns)
          .set({ canvasConfig: body.canvasConfig, updatedAt: now })
          .where(eq(campaigns.id, id))

        return sendSuccess(reply, {
          saved: true,
          version: now.toISOString(),
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
