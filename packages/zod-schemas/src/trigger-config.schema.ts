import { z } from 'zod'

export const eventTypeEnumSchema = z.enum([
  'BET',
  'DEPOSIT',
  'REFERRAL',
  'LOGIN',
  'OPT_IN',
  'FREE_SPIN_USED',
  'MANUAL',
  'MECHANIC_OUTCOME',
])

export const triggerFilterSchema = z.object({
  gameCategory: z.string().optional(),
  minAmount: z.number().nonnegative().optional(),
  gameId: z.string().optional(),
  referralCount: z.number().int().nonnegative().optional(),
})

export const triggerConfigSchema = z.object({
  eventType: eventTypeEnumSchema,
  filters: triggerFilterSchema.optional(),
})
