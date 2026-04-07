import type { FastifyInstance, FastifyReply } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { wizardDrafts, campaigns } from '@promotionos/db'
import { requireAdmin } from '../../lib/jwt-user'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'

const saveDraftBodySchema = z.object({
  campaignId: z.string().uuid().nullable().optional(),
  stepData: z.record(z.unknown()),
})

const draftIdParamsSchema = z.object({ draftId: z.string().uuid() })

export async function wizardDraftRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/wizard-drafts — list drafts for the current user
  fastify.get(
    '/api/v1/admin/wizard-drafts',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      try {
        const userId = request.user.sub
        const drafts = await fastify.db
          .select()
          .from(wizardDrafts)
          .where(eq(wizardDrafts.ownerId, userId))
          .orderBy(wizardDrafts.lastSavedAt)
        return sendSuccess(reply, { drafts })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/wizard-drafts/:draftId
  fastify.get(
    '/api/v1/admin/wizard-drafts/:draftId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = draftIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid draft id')
      }
      try {
        const [draft] = await fastify.db
          .select()
          .from(wizardDrafts)
          .where(
            and(
              eq(wizardDrafts.id, paramsParsed.data.draftId),
              eq(wizardDrafts.ownerId, request.user.sub),
            ),
          )
          .limit(1)
        if (!draft) {
          return sendError(reply, 'NOT_FOUND', 'Wizard draft not found')
        }
        return sendSuccess(reply, { draft })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/admin/wizard-drafts/by-campaign/:campaignId
  fastify.get(
    '/api/v1/admin/wizard-drafts/by-campaign/:campaignId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const params = z.object({ campaignId: z.string().uuid() }).safeParse(request.params)
      if (!params.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid campaign id')
      }
      try {
        const [draft] = await fastify.db
          .select()
          .from(wizardDrafts)
          .where(
            and(
              eq(wizardDrafts.campaignId, params.data.campaignId),
              eq(wizardDrafts.ownerId, request.user.sub),
            ),
          )
          .limit(1)
        return sendSuccess(reply, { draft: draft ?? null })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // POST /api/v1/admin/wizard-drafts — create new draft
  fastify.post(
    '/api/v1/admin/wizard-drafts',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const bodyParsed = saveDraftBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }
      try {
        const [created] = await fastify.db
          .insert(wizardDrafts)
          .values({
            campaignId: bodyParsed.data.campaignId ?? null,
            ownerId: request.user.sub,
            stepData: bodyParsed.data.stepData,
            lastSavedAt: new Date(),
          })
          .returning()
        return sendSuccess(reply, { draft: created }, 201)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // PUT /api/v1/admin/wizard-drafts/:draftId — update existing draft
  fastify.put(
    '/api/v1/admin/wizard-drafts/:draftId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = draftIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid draft id')
      }
      const bodyParsed = saveDraftBodySchema.safeParse(request.body)
      if (!bodyParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', bodyParsed.error.message)
      }
      try {
        const [existing] = await fastify.db
          .select()
          .from(wizardDrafts)
          .where(
            and(
              eq(wizardDrafts.id, paramsParsed.data.draftId),
              eq(wizardDrafts.ownerId, request.user.sub),
            ),
          )
          .limit(1)
        if (!existing) {
          return sendError(reply, 'NOT_FOUND', 'Wizard draft not found')
        }

        const [updated] = await fastify.db
          .update(wizardDrafts)
          .set({
            campaignId: bodyParsed.data.campaignId ?? existing.campaignId,
            stepData: bodyParsed.data.stepData,
            lastSavedAt: new Date(),
          })
          .where(eq(wizardDrafts.id, paramsParsed.data.draftId))
          .returning()
        return sendSuccess(reply, { draft: updated })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // DELETE /api/v1/admin/wizard-drafts/:draftId
  fastify.delete(
    '/api/v1/admin/wizard-drafts/:draftId',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const paramsParsed = draftIdParamsSchema.safeParse(request.params)
      if (!paramsParsed.success) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid draft id')
      }
      try {
        const [existing] = await fastify.db
          .select()
          .from(wizardDrafts)
          .where(
            and(
              eq(wizardDrafts.id, paramsParsed.data.draftId),
              eq(wizardDrafts.ownerId, request.user.sub),
            ),
          )
          .limit(1)
        if (!existing) {
          return sendError(reply, 'NOT_FOUND', 'Wizard draft not found')
        }
        await fastify.db.delete(wizardDrafts).where(eq(wizardDrafts.id, paramsParsed.data.draftId))
        return sendSuccess(reply, { deleted: true })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
