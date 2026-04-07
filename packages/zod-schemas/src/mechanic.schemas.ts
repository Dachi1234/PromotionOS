import { z } from 'zod'

export const mechanicTypeSchema = z.enum([
  'WHEEL',
  'WHEEL_IN_WHEEL',
  'LEADERBOARD',
  'LEADERBOARD_LAYERED',
  'MISSION',
  'PROGRESS_BAR',
  'CASHOUT',
  'TOURNAMENT',
])

export const mechanicRoleSchema = z.enum(['primary', 'unlocked'])

// Legacy Phase 1 config schemas (superseded by Phase 3 mechanics/ schemas)
export const wheelConfigSchemaV1 = z.object({
  slices: z.number().int().min(2).max(64),
  spinLimit: z
    .object({
      total: z.number().int().positive().nullable(),
      perDay: z.number().int().positive().nullable(),
      perPlayer: z.number().int().positive().nullable(),
    })
    .optional(),
  spinTrigger: z.enum(['manual', 'auto_on_event']).default('manual'),
})

export const leaderboardConfigSchemaV1 = z.object({
  rankingMetric: z.string().min(1),
  windowType: z.enum(['daily', 'weekly', 'campaign']),
  topPrizes: z.number().int().positive(),
  tieBreakerRule: z
    .enum(['earliest_first', 'highest_metric_first'])
    .default('earliest_first'),
})

export const missionStepSchemaV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  goalType: z.string().min(1),
  goalTarget: z.number().positive(),
  timeWindowHours: z.number().int().positive().nullable(),
  rewardOnCompletion: z.unknown().optional(),
  sequential: z.boolean().default(true),
})

export const missionConfigSchemaV1 = z.object({
  steps: z.array(missionStepSchemaV1).min(1),
})

export const progressBarConfigSchemaV1 = z.object({
  goal: z.number().positive(),
  metric: z.string().min(1),
  transformationRule: z.unknown().optional(),
})

export const mechanicConfigSchema = z.union([
  wheelConfigSchemaV1,
  leaderboardConfigSchemaV1,
  missionConfigSchemaV1,
  progressBarConfigSchemaV1,
  z.record(z.unknown()),
])

export const createMechanicSchema = z.object({
  campaignId: z.string().uuid(),
  type: mechanicTypeSchema,
  config: z.record(z.unknown()),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const updateMechanicSchema = z.object({
  config: z.record(z.unknown()).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const mechanicResponseSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  type: mechanicTypeSchema,
  config: z.record(z.unknown()),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const unlockConditionSchema = z.object({
  type: z.enum(['WIN', 'COMPLETE', 'REACH_SCORE']),
  mechanicId: z.string().uuid(),
  threshold: z.number().optional(),
})
