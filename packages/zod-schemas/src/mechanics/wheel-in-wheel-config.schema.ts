import { z } from 'zod'
import { spinTriggerSchema } from './wheel-config.schema'

export const wheelInWheelConfigSchema = z.object({
  spin_trigger: spinTriggerSchema,
  max_spins_campaign: z.number().int().positive().optional(),
  max_spins_per_day: z.number().int().positive().optional(),
  max_spins_total: z.number().int().positive().optional(),
  visual_config: z
    .object({
      spin_duration_ms: z.number().int().positive().default(3000),
      slice_colors: z.array(z.string()).optional(),
    })
    .optional(),
})
