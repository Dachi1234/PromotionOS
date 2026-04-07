import type { FastifyInstance } from 'fastify'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { asc, eq, inArray } from 'drizzle-orm'
import type * as DbSchema from '@promotionos/db'
import type { Campaign, CampaignSegment, Mechanic, RewardDefinition } from '@promotionos/db'
import {
  campaigns,
  mechanics,
  campaignSegments,
  playerCampaignOptins,
  rewardDefinitions,
} from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import { EligibilityService } from '../../services/eligibility.service'
import { CampaignOptinRepository } from '../../repositories/campaign-optin.repository'

type SlugParam = { Params: { slug: string } }

type EngineDb = PostgresJsDatabase<typeof DbSchema>

type DisplayReward = Omit<RewardDefinition, 'probabilityWeight'>

function stripRewardDefinition(def: RewardDefinition): DisplayReward {
  const { probabilityWeight: _probabilityWeight, ...rest } = def
  return rest
}

async function loadDisplayMechanics(db: EngineDb, campaignId: string) {
  const mechanicRows = await db
    .select()
    .from(mechanics)
    .where(eq(mechanics.campaignId, campaignId))
    .orderBy(asc(mechanics.displayOrder))

  if (mechanicRows.length === 0) {
    return []
  }

  const mechanicIds = mechanicRows.map((m) => m.id)
  const rewardRows = await db
    .select()
    .from(rewardDefinitions)
    .where(inArray(rewardDefinitions.mechanicId, mechanicIds))

  const rewardsByMechanic = new Map<string, RewardDefinition[]>()
  for (const r of rewardRows) {
    const list = rewardsByMechanic.get(r.mechanicId) ?? []
    list.push(r)
    rewardsByMechanic.set(r.mechanicId, list)
  }

  return mechanicRows.map((m: Mechanic) => ({
    id: m.id,
    type: m.type,
    config: m.config,
    displayOrder: m.displayOrder,
    isActive: m.isActive,
    rewards: (rewardsByMechanic.get(m.id) ?? []).map(stripRewardDefinition),
  }))
}

function isCampaignVisible(status: Campaign['status']): boolean {
  return status === 'active' || status === 'ended'
}

export async function publicCampaignRoutes(fastify: FastifyInstance): Promise<void> {
  const eligibilityService = new EligibilityService()

  fastify.get<SlugParam>('/api/v1/campaigns/:slug', async (request, reply) => {
    const { slug } = request.params
    const player = request.player

    try {
      const db = fastify.db
      const campaignRows = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.slug, slug))
        .limit(1)
      const campaign = campaignRows[0]

      if (!campaign || !isCampaignVisible(campaign.status)) {
        return sendError(reply, 'CAMPAIGN_NOT_FOUND')
      }

      let segment: CampaignSegment | null = null
      if (campaign.targetSegmentId) {
        const segRows = await db
          .select()
          .from(campaignSegments)
          .where(eq(campaignSegments.id, campaign.targetSegmentId))
          .limit(1)
        segment = segRows[0] ?? null
      }

      const displayMechanics = await loadDisplayMechanics(db, campaign.id)
      const eligibility = eligibilityService.evaluate(player, campaign, segment)

      const optinRepo = new CampaignOptinRepository(db)
      const existingOptin = await optinRepo.findByPlayerAndCampaign(player.id, campaign.id)

      return sendSuccess(reply, {
        campaign,
        mechanics: displayMechanics,
        eligibility: {
          isEligible: eligibility.isEligible,
          segmentIncluded: eligibility.segmentIncluded,
          failedConditions: eligibility.failedConditions,
        },
        isOptedIn: existingOptin !== null,
      })
    } catch (err) {
      return handleRouteError(reply, err)
    }
  })

  fastify.post<SlugParam>('/api/v1/campaigns/:slug/opt-in', async (request, reply) => {
    const { slug } = request.params
    const player = request.player

    try {
      const db = fastify.db
      const campaignRows = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.slug, slug))
        .limit(1)
      const campaign = campaignRows[0]

      if (!campaign) {
        return sendError(reply, 'CAMPAIGN_NOT_FOUND')
      }

      if (campaign.status !== 'active') {
        return sendError(reply, 'CAMPAIGN_NOT_ACTIVE')
      }

      let segment: CampaignSegment | null = null
      if (campaign.targetSegmentId) {
        const segRows = await db
          .select()
          .from(campaignSegments)
          .where(eq(campaignSegments.id, campaign.targetSegmentId))
          .limit(1)
        segment = segRows[0] ?? null
      }

      const eligibility = eligibilityService.evaluate(player, campaign, segment)
      if (!eligibility.isEligible) {
        return sendError(reply, 'NOT_ELIGIBLE')
      }

      const optinRepo = new CampaignOptinRepository(db)
      const existing = await optinRepo.findByPlayerAndCampaign(player.id, campaign.id)
      if (existing) {
        return sendError(reply, 'ALREADY_OPTED_IN')
      }

      const created = await optinRepo.create(player.id, campaign.id)
      return sendSuccess(reply, { optedInAt: created.optedInAt })
    } catch (err) {
      return handleRouteError(reply, err)
    }
  })
}
