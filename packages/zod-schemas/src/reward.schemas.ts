import { z } from 'zod'

export const rewardTypeSchema = z.enum([
  'FREE_SPINS',
  'FREE_BET',
  'CASH',
  'CASHBACK',
  'VIRTUAL_COINS',
  'MULTIPLIER',
  'PHYSICAL',
  'ACCESS_UNLOCK',
  'EXTRA_SPIN',
])

export const playerRewardStatusSchema = z.enum([
  'pending',
  'condition_pending',
  'fulfilled',
  'expired',
  'forfeited',
])

export const rewardExecutionStatusSchema = z.enum([
  'pending',
  'success',
  'failed',
  'retrying',
])

export const createRewardDefinitionSchema = z.object({
  mechanicId: z.string().uuid(),
  type: rewardTypeSchema,
  config: z.record(z.unknown()),
  probabilityWeight: z.number().positive().optional(),
  conditionConfig: z.record(z.unknown()).optional(),
})

export const rewardDefinitionResponseSchema = z.object({
  id: z.string().uuid(),
  mechanicId: z.string().uuid(),
  type: rewardTypeSchema,
  config: z.record(z.unknown()),
  probabilityWeight: z.string().nullable(),
  conditionConfig: z.unknown().nullable(),
  createdAt: z.date(),
})

export const playerRewardResponseSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid(),
  campaignId: z.string().uuid(),
  mechanicId: z.string().uuid(),
  rewardDefinitionId: z.string().uuid(),
  status: playerRewardStatusSchema,
  conditionSnapshot: z.unknown().nullable(),
  grantedAt: z.date(),
  expiresAt: z.date().nullable(),
  fulfilledAt: z.date().nullable(),
})

export const claimRewardSchema = z.object({
  rewardId: z.string().uuid(),
})

export const rewardTransformationConfigSchema = z.object({
  operation: z.enum(['MULTIPLY', 'PERCENTAGE', 'CAP', 'NONE']),
  field: z.string().min(1),
  factor: z.number().optional(),
  cap: z.number().optional(),
  filter: z.record(z.string()).optional(),
})
