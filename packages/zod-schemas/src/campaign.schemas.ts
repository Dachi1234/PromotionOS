import { z } from 'zod'

export const campaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'active',
  'paused',
  'ended',
  'archived',
])

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  currency: z.string().min(1).max(10).default('GEL'),
  targetSegmentId: z.string().uuid().optional(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(1000).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  currency: z.string().min(1).max(10).optional(),
  targetSegmentId: z.string().uuid().optional(),
})

export const campaignStatusTransitionSchema = z.object({
  status: campaignStatusSchema,
})

export const listCampaignsQuerySchema = z.object({
  status: campaignStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const campaignResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  targetSegmentId: z.string().uuid().nullable(),
  currency: z.string(),
  startsAt: z.date(),
  endsAt: z.date(),
  canvasConfig: z.unknown().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
