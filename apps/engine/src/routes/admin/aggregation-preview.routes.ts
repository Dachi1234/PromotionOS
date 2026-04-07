import type { FastifyInstance, FastifyReply } from 'fastify'
import { aggregationPreviewRequestSchema } from '@promotionos/zod-schemas'
import { applyTransformationChain } from '../../services/transformation-evaluator.service'
import { requireAdmin } from '../../lib/jwt-user'
import type { TransformationConfig, Metric } from '@promotionos/types'

export async function aggregationPreviewRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/v1/admin/aggregation-rules/preview',
    { preHandler: requireAdmin },
    async (request, reply: FastifyReply) => {
      const parsed = aggregationPreviewRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(422).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        })
      }

      const { sourceValue, transformation, metric } = parsed.data
      const transformationTyped = transformation as TransformationConfig | TransformationConfig[]
      const result = applyTransformationChain(sourceValue, transformationTyped)

      const metricLabel = metric as Metric
      const description = `${result.inputValue} → ${result.description} (${metricLabel})`

      return reply.send({
        success: true,
        data: {
          inputValue: result.inputValue,
          transformedValue: result.transformedValue,
          description,
        },
      })
    },
  )
}
