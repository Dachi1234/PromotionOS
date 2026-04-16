import { eq, and, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { aggregationRules, campaigns } from '@promotionos/db'
import type { AggregationRule } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

/**
 * Data access for aggregation_rules.
 *
 * All queries here scope to `deleted_at IS NULL` — soft-deleted rules
 * are tombstones retained for audit history but excluded from every
 * active path (trigger matching, leaderboard computation, scheduled
 * refresh, etc.). If you add a method, preserve this invariant.
 */
export class AggregationRuleRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<AggregationRule | null> {
    const rows = await this.db
      .select()
      .from(aggregationRules)
      .where(and(eq(aggregationRules.id, id), isNull(aggregationRules.deletedAt)))
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
        deletedAt: aggregationRules.deletedAt,
        campaignStartsAt: campaigns.startsAt,
        campaignEndsAt: campaigns.endsAt,
      })
      .from(aggregationRules)
      .innerJoin(campaigns, eq(aggregationRules.campaignId, campaigns.id))
      .where(and(eq(aggregationRules.id, id), isNull(aggregationRules.deletedAt)))
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
          isNull(aggregationRules.deletedAt),
        ),
      )
  }

  async findByCampaignId(campaignId: string): Promise<AggregationRule[]> {
    return this.db
      .select()
      .from(aggregationRules)
      .where(
        and(
          eq(aggregationRules.campaignId, campaignId),
          isNull(aggregationRules.deletedAt),
        ),
      )
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
        deletedAt: aggregationRules.deletedAt,
        campaignStartsAt: campaigns.startsAt,
        campaignEndsAt: campaigns.endsAt,
      })
      .from(aggregationRules)
      .innerJoin(campaigns, eq(aggregationRules.campaignId, campaigns.id))
      .where(
        and(
          eq(aggregationRules.windowType, windowType),
          eq(campaigns.status, 'active'),
          isNull(aggregationRules.deletedAt),
        ),
      )
    return rows
  }
}
