import { z } from 'zod'
import { conditionNodeSchema } from '../condition-tree.schema'

export const cashoutConfigSchema = z.object({
  claim_conditions: conditionNodeSchema,
  reward_definition_id: z.string().uuid(),
  max_claims_per_player: z.number().int().positive().default(1),
  cooldown_hours: z.number().positive().optional(),
})
