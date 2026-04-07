import { z } from 'zod'

export const eventTypeSchema = z.enum([
  'BET',
  'DEPOSIT',
  'REFERRAL',
  'LOGIN',
  'OPT_IN',
  'FREE_SPIN_USED',
  'MANUAL',
  'MECHANIC_OUTCOME',
])

export const ingestEventSchema = z.object({
  playerId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  eventType: eventTypeSchema,
  payload: z.record(z.unknown()),
  occurredAt: z.coerce.date(),
})

export const listEventsQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  eventType: eventTypeSchema.optional(),
  processed: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => {
      if (typeof v === 'boolean') return v
      return v === 'true'
    })
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})
