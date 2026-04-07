import { z } from 'zod'

export const spinResultSchema = z.object({
  type: z.literal('spin'),
  sliceIndex: z.number().int().nonnegative(),
  rewardDefinitionId: z.string().uuid(),
  rewardType: z.string(),
  playerRewardId: z.string().uuid(),
  conditionPending: z.boolean().optional(),
})

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  playerId: z.string().uuid(),
  displayName: z.string(),
  value: z.number(),
})

export const leaderboardResultSchema = z.object({
  type: z.literal('leaderboard'),
  entries: z.array(leaderboardEntrySchema),
  playerRank: z.number().int().positive().nullable(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

export const progressResultSchema = z.object({
  type: z.literal('progress'),
  current: z.number(),
  target: z.number(),
  percentage: z.number(),
  completed: z.boolean(),
  claimed: z.boolean(),
})

export const missionResultSchema = z.object({
  type: z.literal('mission'),
  executionMode: z.string(),
  steps: z.array(z.object({
    stepId: z.string(),
    title: z.string(),
    status: z.string(),
    currentValue: z.number(),
    targetValue: z.number(),
    percentage: z.number(),
  })),
})

export const claimResultSchema = z.object({
  type: z.literal('claim'),
  playerRewardId: z.string().uuid(),
  rewardType: z.string(),
  status: z.string(),
})

export const mechanicResultSchema = z.union([
  spinResultSchema,
  leaderboardResultSchema,
  progressResultSchema,
  missionResultSchema,
  claimResultSchema,
])
