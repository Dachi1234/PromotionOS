import type { CampaignRepository } from './campaign.repository'
import type { CampaignStatus, CreateCampaignInput, UpdateCampaignInput } from './campaign.schema'
import { AppError } from '../../lib/errors'

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['scheduled', 'active'],
  scheduled: ['active', 'draft'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: ['archived'],
  archived: [],
}

const IMMUTABLE_STATUSES: CampaignStatus[] = ['ended', 'archived']
const LOCKED_STATUSES: CampaignStatus[] = ['active']

export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async createCampaign(input: CreateCampaignInput, createdBy: string) {
    const existing = await this.campaignRepository.findBySlug(input.slug)
    if (existing) {
      throw new AppError('SLUG_CONFLICT', `Slug "${input.slug}" is already taken`, 409)
    }

    if (input.endsAt <= input.startsAt) {
      throw new AppError(
        'INVALID_DATES',
        'ends_at must be after starts_at',
        422,
      )
    }

    return this.campaignRepository.create({
      name: input.name,
      slug: input.slug,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      currency: input.currency,
      targetSegmentId: input.targetSegmentId,
      createdBy,
    })
  }

  async getCampaigns(options: { status?: CampaignStatus; page: number; limit: number }) {
    return this.campaignRepository.list(options)
  }

  async getCampaignById(id: string) {
    const result = await this.campaignRepository.findByIdWithDetails(id)
    if (!result) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }
    return result
  }

  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const campaign = await this.campaignRepository.findById(id)
    if (!campaign) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }

    if (IMMUTABLE_STATUSES.includes(campaign.status)) {
      throw new AppError(
        'CAMPAIGN_IMMUTABLE',
        `Campaign with status "${campaign.status}" cannot be modified`,
        409,
      )
    }

    if (LOCKED_STATUSES.includes(campaign.status)) {
      throw new AppError(
        'CAMPAIGN_LOCKED',
        'Active campaigns cannot be modified. Pause the campaign first.',
        409,
      )
    }

    if (input.slug && input.slug !== campaign.slug) {
      const existing = await this.campaignRepository.findBySlug(input.slug)
      if (existing) {
        throw new AppError('SLUG_CONFLICT', `Slug "${input.slug}" is already taken`, 409)
      }
    }

    const updated = await this.campaignRepository.update(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      currency: input.currency,
      targetSegmentId: input.targetSegmentId,
    })

    if (!updated) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }

    return updated
  }

  async transitionStatus(id: string, targetStatus: CampaignStatus) {
    const campaign = await this.campaignRepository.findById(id)
    if (!campaign) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }

    const currentStatus = campaign.status
    const allowed = VALID_TRANSITIONS[currentStatus]

    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Cannot transition from "${currentStatus}" to "${targetStatus}"`,
        409,
      )
    }

    // If transitioning to 'active' but campaign hasn't started yet → schedule instead
    let resolvedStatus = targetStatus
    if (targetStatus === 'active' && campaign.startsAt > new Date()) {
      resolvedStatus = 'scheduled'
    }

    const updated = await this.campaignRepository.update(id, {
      status: resolvedStatus,
    })

    if (!updated) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }

    return updated
  }

  async deleteCampaign(id: string) {
    const campaign = await this.campaignRepository.findById(id)
    if (!campaign) {
      throw new AppError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404)
    }

    if (campaign.status !== 'draft') {
      throw new AppError(
        'CAMPAIGN_NOT_DELETABLE',
        'Only draft campaigns can be deleted',
        409,
      )
    }

    await this.campaignRepository.delete(id)
    return { deleted: true }
  }
}
