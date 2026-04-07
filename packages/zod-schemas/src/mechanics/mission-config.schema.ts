import { z } from 'zod'

export const missionStepSchema = z.object({
  step_id: z.string().uuid(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  metric_type: z.string().min(1),
  target_value: z.number().positive(),
  time_limit_hours: z.number().positive(),
  reward_definition_id: z.string().uuid(),
})

export const missionConfigSchema = z.object({
  execution_mode: z.enum(['sequential', 'parallel']),
  steps: z.array(missionStepSchema).min(1),
})

export const missionStepStatusSchema = z.enum([
  'locked',
  'active',
  'completed',
  'claimed',
  'expired',
])

export const missionStepStateSchema = z.object({
  status: missionStepStatusSchema,
  activated_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  claimed_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  current_value: z.number(),
  target_value: z.number(),
})
