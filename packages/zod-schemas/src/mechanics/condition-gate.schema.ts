import { z } from 'zod'

export const conditionTypeGateSchema = z.enum([
  'DEPOSIT_AMOUNT',
  'BET_AMOUNT',
  'REFERRAL_COUNT',
  'MISSION_COMPLETE',
])

export const onFailurePolicySchema = z.enum(['expire', 'carry_over'])

export const conditionGateConfigSchema = z.object({
  condition_type: conditionTypeGateSchema,
  target_value: z.number().positive(),
  time_limit_hours: z.number().positive(),
  on_failure: onFailurePolicySchema,
})

export const conditionSnapshotSchema = z.object({
  condition_type: conditionTypeGateSchema,
  target_value: z.number(),
  current_value: z.number(),
  time_limit_hours: z.number(),
  assigned_at: z.string(),
  expires_at: z.string(),
  on_failure: onFailurePolicySchema,
})
