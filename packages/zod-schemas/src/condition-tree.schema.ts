import { z } from 'zod'

export const conditionOperatorSchema = z.enum(['AND', 'OR'])

export const conditionTypeSchema = z.enum([
  'MIN_DEPOSIT_GEL',
  'GAME_CATEGORY',
  'VIP_TIER',
  'SEGMENT_TAG',
  'REGISTRATION_AGE',
  'MIN_BET_AMOUNT',
  'MIN_DEPOSIT_AMOUNT',
  'MIN_DEPOSIT_COUNT',
  'MIN_BET_COUNT',
])

export type ConditionNode = z.infer<typeof conditionLeafSchema> | z.infer<typeof conditionGroupSchema>

const conditionLeafSchema = z.object({
  type: conditionTypeSchema,
  value: z.unknown(),
})

const conditionGroupSchema: z.ZodType<{
  operator: 'AND' | 'OR'
  conditions: ConditionNode[]
}> = z.lazy(() =>
  z.object({
    operator: conditionOperatorSchema,
    conditions: z.array(conditionNodeSchema).min(1),
  }),
)

export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.union([conditionLeafSchema, conditionGroupSchema]),
)

export const conditionEvaluationResultSchema = z.object({
  eligible: z.boolean(),
  failedConditions: z.array(z.string()).optional(),
})
