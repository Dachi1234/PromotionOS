import type { z } from 'zod'
import type {
  metricEnumSchema,
  windowTypeEnumSchema,
  transformationConfigSchema,
  transformationOperationSchema,
  aggregationRuleSchema,
  aggregationPreviewRequestSchema,
  aggregationPreviewResponseSchema,
} from '@promotionos/zod-schemas'

export type Metric = z.infer<typeof metricEnumSchema>
export type WindowType = z.infer<typeof windowTypeEnumSchema>
export type TransformationOperation = z.infer<typeof transformationOperationSchema>
export type TransformationConfig = z.infer<typeof transformationConfigSchema>
export type AggregationRuleInput = z.infer<typeof aggregationRuleSchema>
export type AggregationPreviewRequest = z.infer<typeof aggregationPreviewRequestSchema>
export type AggregationPreviewResponse = z.infer<typeof aggregationPreviewResponseSchema>
