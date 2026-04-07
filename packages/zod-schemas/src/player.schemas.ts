import { z } from 'zod'

export const vipTierSchema = z.enum(['bronze', 'silver', 'gold', 'platinum'])

export const createPlayerSchema = z.object({
  externalId: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  segmentTags: z.array(z.string()).default([]),
  vipTier: vipTierSchema.default('bronze'),
  totalDepositsGel: z.number().nonnegative().default(0),
  registrationDate: z.coerce.date(),
})

export const listPlayersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  vipTier: vipTierSchema.optional(),
  segmentTag: z.string().optional(),
})

export const playerResponseSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  segmentTags: z.array(z.string()),
  vipTier: vipTierSchema,
  totalDepositsGel: z.string(),
  registrationDate: z.date(),
  createdAt: z.date(),
})

export const playerContextSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  displayName: z.string(),
  segmentTags: z.array(z.string()),
  vipTier: vipTierSchema,
  totalDepositsGel: z.number(),
  registrationDate: z.date(),
})

export const createSessionResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.date(),
})
