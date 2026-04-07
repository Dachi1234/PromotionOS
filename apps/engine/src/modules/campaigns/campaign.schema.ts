export {
  campaignStatusSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignStatusTransitionSchema,
  listCampaignsQuerySchema,
  campaignResponseSchema,
} from '@promotionos/zod-schemas'

export type {
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignStatusTransitionInput,
  ListCampaignsQuery,
  CampaignResponse,
} from '@promotionos/types'
