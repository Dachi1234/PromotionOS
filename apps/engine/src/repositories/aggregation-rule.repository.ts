import { eq, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { aggregationRules, campaigns } from '@promotionos/db'
import type { AggregationRule } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class AggregationRuleRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<AggregationRule | null> {
    const rows = await this.db
      .select()
      .from(aggregationRules)
      .where(eq(aggregationRules.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByIdWithCampaignDates(id: string): Promise<(AggregationRule & { campaignStartsAt: Date; campaignEndsAt: Date }) | null> {
    const rows = await this.db
      .select({
        id: aggregationRules.id,
        campaignId: aggregationRules.campaignId,
        mechanicId: aggregationRules.mechanicId,
        sourceEventType: aggregationRules.sourceEventType,
        metric: aggregationRules.metric,
        transformation: aggregationRules.transformation,
        windowType: aggregationRules.windowType,
        windowSizeHours: aggregationRules.windowSizeHours,
        createdAt: aggregationRules.createdAt,
        campaignStartsAt: campaigns.startsAt,
        campaignEndsAt: campaigns.endsAt,
      })
      .from(aggregationRules)
      .innerJoin(campaigns, eq(aggregationRules.campaignId, campaigns.id))
      .where(eq(aggregationRules.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByCampaignAndEventType(
    campaignId: string,
    sourceEventType: typeof aggregationRules.sourceEventType.enumValues[number],
  ): Promise<AggregationRule[]> {
    return this.db
      .select()
      .from(aggregationRules)
      .where(
        and(
          eq(aggregationRules.campaignId, campaignId),
          eq(aggregationRules.sourceEventType, sourceEventType),
        ),
      )
  }

  async findByCampaignId(campaignId: string): Promise<AggregationRule[]> {
    return this.db
      .select()
      .from(aggregationRules)
      .where(eq(aggregationRules.campaignId, campaignId))
  }

  async findActiveRulesByWindowType(
    windowType: typeof aggregationRules.windowType.enumValues[number],
  ): Promise<(AggregationRule & { campaignStartsAt: Date; campaignEndsAt: Date })[]> {
    const rows = await this.db
      .select({
        id: aggregationRules.id,
        campaignId: aggregationRules.campaignId,
        mechanicId: aggregationRules.mechanicId,
        sourceEventType: aggregationRules.sourceEventType,
        metric: aggregationRules.metric,
        transformation: aggregationRules.transformation,
        windowType: aggregationRules.windowType,
        windowSizeHours: aggregationRules.windowSizeHours,
        createdAt: aggregationRules.createdAt,
        campaignStartsAt: campaigns.startsAt,
        campaignEndsAt: campaigns.endsAt,
      })
      .from(aggregationRules)
      .innerJoin(campaigns, eq(aggregationRules.campaignId, campaigns.id))
      .where(
        and(
          eq(aggregationRules.windowType, windowType),
          eq(campaigns.status, 'active'),
        ),
      )
    return rows
  }
}
