import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { campaigns } from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'

const slugParamsSchema = z.object({ slug: z.string().min(1) })

export async function publicCanvasConfigRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/campaigns/:slug/canvas',
    async (request, reply: FastifyReply) => {
      try {
        const params = slugParamsSchema.safeParse(request.params)
        if (!params.success) return sendError(reply, 'VALIDATION_ERROR', params.error.message)
        const { slug } = params.data

        const [campaign] = await fastify.db
          .select({
            id: campaigns.id,
            canvasConfig: campaigns.canvasConfig,
            status: campaigns.status,
            name: campaigns.name,
          })
          .from(campaigns)
          .where(eq(campaigns.slug, slug))
          .limit(1)

        if (!campaign) {
          return sendError(reply, 'NOT_FOUND', 'Campaign not found', 404)
        }

        const previewMode = (request.query as Record<string, string>).preview
        if (previewMode !== 'admin' && campaign.status !== 'active' && campaign.status !== 'ended') {
          return sendError(reply, 'NOT_FOUND', 'Campaign not available', 404)
        }

        return sendSuccess(reply, {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: campaign.status,
          canvasConfig: campaign.canvasConfig ?? null,
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
