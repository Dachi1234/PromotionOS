import type { z } from 'zod'
import type {
  campaignStatusSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignStatusTransitionSchema,
  listCampaignsQuerySchema,
  campaignResponseSchema,
} from '@promotionos/zod-schemas'

export type CampaignStatus = z.infer<typeof campaignStatusSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type CampaignStatusTransitionInput = z.infer<typeof campaignStatusTransitionSchema>
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>
export type CampaignResponse = z.infer<typeof campaignResponseSchema>
