import { z } from 'zod'
import { leaderboardConfigSchema } from './leaderboard-config.schema'

export const leaderboardLayeredConfigSchema = z.object({
  leaderboard_1: leaderboardConfigSchema,
  leaderboard_2: leaderboardConfigSchema,
  unlock_threshold_coins: z.number().int().positive(),
  coin_award_mode: z.enum(['end_of_period', 'continuous']).default('end_of_period'),
  coins_per_hour_by_rank: z
    .array(z.object({ from_rank: z.number(), to_rank: z.number(), coins: z.number() }))
    .optional(),
})
