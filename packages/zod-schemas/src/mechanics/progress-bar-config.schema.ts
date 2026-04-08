import { z } from 'zod'

export const progressBarConfigSchema = z.object({
  metric_type: z.string().min(1),
  target_value: z.number().positive(),
  reward_definition_id: z.string().uuid(),
  auto_grant: z.boolean().default(false),
  window_type: z.enum(['minute', 'hourly', 'daily', 'weekly', 'campaign', 'rolling']).default('campaign'),
})
