import { eq, inArray, desc, count, and, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import {
  campaigns,
  mechanics,
  aggregationRules,
  rewardDefinitions,
} from '@promotionos/db'
import type { CampaignStatus } from './campaign.schema'

type Db = PostgresJsDatabase<typeof schema>

export interface ListCampaignsOptions {
  status?: CampaignStatus
  page: number
  limit: number
}

export interface CreateCampaignData {
  name: string
  slug: string
  description?: string
  startsAt: Date
  endsAt: Date
  currency: string
  targetSegmentId?: string
  createdBy: string
}

export interface UpdateCampaignData {
  name?: string
  slug?: string
  description?: string
  startsAt?: Date
  endsAt?: Date
  currency?: string
  targetSegmentId?: string
  status?: CampaignStatus
  updatedAt?: Date
}

export class CampaignRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findBySlug(slug: string) {
    const rows = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, slug))
      .limit(1)
    return rows[0] ?? null
  }

  async findByIdWithDetails(id: string) {
    const campaign = await this.findById(id)
    if (!campaign) return null

    const campaignMechanics = await this.db
      .select()
      .from(mechanics)
      .where(eq(mechanics.campaignId, id))

    const mechanicIds = campaignMechanics.map((m) => m.id)

    const [campaignAggregationRules, campaignRewardDefs] = await Promise.all([
      // Exclude soft-deleted rules: campaign detail feeds the studio edit
      // view, which would otherwise show tombstones and round-trip them on
      // save. See 0005_aggregation_rules_soft_delete.sql.
      this.db
        .select()
        .from(aggregationRules)
        .where(
          and(
            eq(aggregationRules.campaignId, id),
            isNull(aggregationRules.deletedAt),
          ),
        ),
      mechanicIds.length > 0
        ? this.db
            .select()
            .from(rewardDefinitions)
            .where(inArray(rewardDefinitions.mechanicId, mechanicIds))
        : Promise.resolve([]),
    ])

    return {
      campaign,
      mechanics: campaignMechanics,
      aggregationRules: campaignAggregationRules,
      rewardDefinitions: campaignRewardDefs,
    }
  }

  async list(options: ListCampaignsOptions) {
    const offset = (options.page - 1) * options.limit

    const whereClause = options.status
      ? eq(campaigns.status, options.status)
      : undefined

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(campaigns)
        .where(whereClause)
        .orderBy(desc(campaigns.createdAt))
        .limit(options.limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(campaigns)
        .where(whereClause),
    ])

    return {
      campaigns: rows,
      total: Number(totalResult[0]?.count ?? 0),
    }
  }

  async create(data: CreateCampaignData) {
    const rows = await this.db
      .insert(campaigns)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        currency: data.currency,
        targetSegmentId: data.targetSegmentId,
        createdBy: data.createdBy,
        status: 'draft',
      })
      .returning()
    const campaign = rows[0]
    if (!campaign) throw new Error('Failed to create campaign')
    return campaign
  }

  async update(id: string, data: UpdateCampaignData) {
    const rows = await this.db
      .update(campaigns)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning()
    const campaign = rows[0]
    if (!campaign) return null
    return campaign
  }

  async delete(id: string) {
    await this.db.delete(campaigns).where(eq(campaigns.id, id))
  }
}
