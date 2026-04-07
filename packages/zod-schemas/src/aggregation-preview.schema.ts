import { z } from 'zod'
import { transformationConfigSchema, metricEnumSchema } from './aggregation-rule.schema'

export const aggregationPreviewRequestSchema = z.object({
  sourceValue: z.number(),
  transformation: z.union([
    transformationConfigSchema,
    z.array(transformationConfigSchema),
  ]),
  metric: metricEnumSchema,
})

export const aggregationPreviewResponseSchema = z.object({
  inputValue: z.number(),
  transformedValue: z.number(),
  description: z.string(),
})
