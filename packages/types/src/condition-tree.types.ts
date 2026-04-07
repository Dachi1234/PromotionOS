import type { z } from 'zod'
import type {
  conditionNodeSchema,
  conditionOperatorSchema,
  conditionTypeSchema,
  conditionEvaluationResultSchema,
} from '@promotionos/zod-schemas'

export type { ConditionNode } from '@promotionos/zod-schemas'
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>
export type ConditionType = z.infer<typeof conditionTypeSchema>
export type ConditionEvaluationResult = z.infer<typeof conditionEvaluationResultSchema>
export type ConditionNodeInput = z.input<typeof conditionNodeSchema>
