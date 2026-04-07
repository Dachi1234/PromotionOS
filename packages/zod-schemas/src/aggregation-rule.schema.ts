import { z } from 'zod'
import { eventTypeEnumSchema } from './trigger-config.schema'

export const metricEnumSchema = z.enum(['COUNT', 'SUM', 'AVERAGE'])

export const windowTypeEnumSchema = z.enum([
  'minute',
  'hourly',
  'daily',
  'weekly',
  'campaign',
  'rolling',
])

export const transformationOperationSchema = z.enum([
  'NONE',
  'MULTIPLY',
  'PERCENTAGE',
  'CAP',
])

export const transformationConfigSchema = z.object({
  operation: transformationOperationSchema,
  field: z.string().optional(),
  factor: z.number().optional(),
  cap: z.number().optional(),
  filter: z.record(z.unknown()).optional(),
})

export const aggregationRuleSchema = z.object({
  sourceEventType: eventTypeEnumSchema,
  metric: metricEnumSchema,
  transformation: z.union([
    transformationConfigSchema,
    z.array(transformationConfigSchema),
  ]),
  windowType: windowTypeEnumSchema,
  windowSizeHours: z.number().int().positive().optional(),
})
