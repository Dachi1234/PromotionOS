import type { FastifyInstance } from 'fastify'
import { mockPlayers } from '@promotionos/db'
import { requireAdmin } from '../../lib/jwt-user'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import { evaluateConditionTree } from '../../services/condition-evaluator.service'
import type { PlayerEvaluationContext } from '../../services/condition-evaluator.service'
import type { ConditionNode } from '@promotionos/types'

export async function segmentPreviewRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/segments/preview (POST body with condition tree)
  fastify.post(
    '/api/v1/admin/segments/preview',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const body = request.body as { conditionTree?: unknown }
        if (!body?.conditionTree) {
          return sendError(reply, 'VALIDATION_ERROR', 'conditionTree is required')
        }

        const conditionTree = body.conditionTree as ConditionNode
        const allPlayers = await fastify.db.select().from(mockPlayers)

        const matching: { id: string; displayName: string }[] = []

        for (const player of allPlayers) {
          const ctx: PlayerEvaluationContext = {
            id: player.id,
            externalId: player.externalId,
            displayName: player.displayName,
            segmentTags: player.segmentTags ?? [],
            vipTier: player.vipTier,
            totalDepositsGel: parseFloat(player.totalDepositsGel ?? '0'),
            registrationDate: player.registrationDate,
          }

          const result = evaluateConditionTree(conditionTree, ctx)
          if (result.eligible) {
            matching.push({ id: player.id, displayName: player.displayName })
          }
        }

        return sendSuccess(reply, {
          matchingCount: matching.length,
          totalPlayers: allPlayers.length,
          preview: matching.slice(0, 10),
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
