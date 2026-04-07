import { z } from 'zod'

export const tieBreakingSchema = z.enum(['first_to_reach', 'highest_secondary', 'split'])

export const prizeDistributionEntrySchema = z.object({
  from_rank: z.number().int().positive(),
  to_rank: z.number().int().positive(),
  reward_definition_id: z.string().uuid(),
})

export const leaderboardConfigSchema = z.object({
  ranking_metric: z.string().min(1),
  window_type: z.enum(['daily', 'weekly', 'campaign']),
  tie_breaking: tieBreakingSchema,
  secondary_metric: z.string().optional(),
  max_displayed_ranks: z.number().int().positive().default(100),
  prize_distribution: z.array(prizeDistributionEntrySchema),
})
