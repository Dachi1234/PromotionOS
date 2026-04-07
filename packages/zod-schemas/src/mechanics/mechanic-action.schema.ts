import { z } from 'zod'

export const mechanicActionTypeSchema = z.enum([
  'spin',
  'auto-spin',
  'claim',
  'claim-step',
  'get-progress',
  'get-leaderboard',
  're-evaluate',
])

export const mechanicActionSchema = z.object({
  type: mechanicActionTypeSchema,
  stepId: z.string().uuid().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
})
