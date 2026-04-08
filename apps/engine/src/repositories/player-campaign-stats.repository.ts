import { eq, and, sql, desc, asc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { playerCampaignStats } from '@promotionos/db'
import type { PlayerCampaignStat } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export interface UpsertStatsInput {
  playerId: string
  campaignId: string
  mechanicId: string
  metricType: string
  windowType: typeof playerCampaignStats.windowType.enumValues[number]
  windowStart: Date
  value: number
  sampleCount: number
}

export class PlayerCampaignStatsRepository {
  constructor(private readonly db: Db) {}

  async findStat(
    playerId: string,
    campaignId: string,
    mechanicId: string,
    metricType: string,
    windowType: typeof playerCampaignStats.windowType.enumValues[number],
    windowStart: Date,
  ): Promise<PlayerCampaignStat | null> {
    const rows = await this.db
      .select()
      .from(playerCampaignStats)
      .where(
        and(
          eq(playerCampaignStats.playerId, playerId),
          eq(playerCampaignStats.campaignId, campaignId),
          eq(playerCampaignStats.mechanicId, mechanicId),
          eq(playerCampaignStats.metricType, metricType),
          eq(playerCampaignStats.windowType, windowType),
          eq(playerCampaignStats.windowStart, windowStart),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  async upsertCount(input: Omit<UpsertStatsInput, 'value' | 'sampleCount'>): Promise<void> {
    await this.db
      .insert(playerCampaignStats)
      .values({
        playerId: input.playerId,
        campaignId: input.campaignId,
        mechanicId: input.mechanicId,
        metricType: input.metricType,
        windowType: input.windowType,
        windowStart: input.windowStart,
        value: '1',
        sampleCount: 1,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          playerCampaignStats.playerId,
          playerCampaignStats.campaignId,
          playerCampaignStats.mechanicId,
          playerCampaignStats.metricType,
          playerCampaignStats.windowType,
          playerCampaignStats.windowStart,
        ],
        set: {
          value: sql`${playerCampaignStats.value} + 1`,
          sampleCount: sql`${playerCampaignStats.sampleCount} + 1`,
          lastUpdatedAt: new Date(),
        },
      })
  }

  async upsertSum(
    input: Omit<UpsertStatsInput, 'sampleCount'>,
  ): Promise<void> {
    await this.db
      .insert(playerCampaignStats)
      .values({
        playerId: input.playerId,
        campaignId: input.campaignId,
        mechanicId: input.mechanicId,
        metricType: input.metricType,
        windowType: input.windowType,
        windowStart: input.windowStart,
        value: input.value.toFixed(4),
        sampleCount: 1,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          playerCampaignStats.playerId,
          playerCampaignStats.campaignId,
          playerCampaignStats.mechanicId,
          playerCampaignStats.metricType,
          playerCampaignStats.windowType,
          playerCampaignStats.windowStart,
        ],
        set: {
          value: sql`${playerCampaignStats.value} + ${input.value}`,
          sampleCount: sql`${playerCampaignStats.sampleCount} + 1`,
          lastUpdatedAt: new Date(),
        },
      })
  }

  async upsertAverage(
    input: UpsertStatsInput,
  ): Promise<void> {
    await this.db
      .insert(playerCampaignStats)
      .values({
        playerId: input.playerId,
        campaignId: input.campaignId,
        mechanicId: input.mechanicId,
        metricType: input.metricType,
        windowType: input.windowType,
        windowStart: input.windowStart,
        value: input.value.toFixed(4),
        sampleCount: 1,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          playerCampaignStats.playerId,
          playerCampaignStats.campaignId,
          playerCampaignStats.mechanicId,
          playerCampaignStats.metricType,
          playerCampaignStats.windowType,
          playerCampaignStats.windowStart,
        ],
        set: {
          value: sql`(${playerCampaignStats.value} * ${playerCampaignStats.sampleCount} + ${input.value}) / (${playerCampaignStats.sampleCount} + 1)`,
          sampleCount: sql`${playerCampaignStats.sampleCount} + 1`,
          lastUpdatedAt: new Date(),
        },
      })
  }

  async setAbsolute(input: UpsertStatsInput): Promise<void> {
    await this.db
      .insert(playerCampaignStats)
      .values({
        playerId: input.playerId,
        campaignId: input.campaignId,
        mechanicId: input.mechanicId,
        metricType: input.metricType,
        windowType: input.windowType,
        windowStart: input.windowStart,
        value: input.value.toFixed(4),
        sampleCount: input.sampleCount,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          playerCampaignStats.playerId,
          playerCampaignStats.campaignId,
          playerCampaignStats.mechanicId,
          playerCampaignStats.metricType,
          playerCampaignStats.windowType,
          playerCampaignStats.windowStart,
        ],
        set: {
          value: input.value.toFixed(4),
          sampleCount: input.sampleCount,
          lastUpdatedAt: new Date(),
        },
      })
  }

  async findRankedByMetric(
    campaignId: string,
    mechanicId: string,
    metricType: string,
    windowType: typeof playerCampaignStats.windowType.enumValues[number],
    windowStart: Date,
    orderDirection: 'asc' | 'desc' = 'desc',
  ): Promise<PlayerCampaignStat[]> {
    const orderFn = orderDirection === 'desc' ? desc : asc
    return this.db
      .select()
      .from(playerCampaignStats)
      .where(
        and(
          eq(playerCampaignStats.campaignId, campaignId),
          eq(playerCampaignStats.mechanicId, mechanicId),
          eq(playerCampaignStats.metricType, metricType),
          eq(playerCampaignStats.windowType, windowType),
          eq(playerCampaignStats.windowStart, windowStart),
        ),
      )
      .orderBy(orderFn(sql`${playerCampaignStats.value}::numeric`))
  }

  async findPlayerStat(
    playerId: string,
    campaignId: string,
    mechanicId: string,
    metricType: string,
    windowType: typeof playerCampaignStats.windowType.enumValues[number],
    windowStart?: Date,
  ): Promise<PlayerCampaignStat | null> {
    const conditions = [
      eq(playerCampaignStats.playerId, playerId),
      eq(playerCampaignStats.campaignId, campaignId),
      eq(playerCampaignStats.mechanicId, mechanicId),
      eq(playerCampaignStats.metricType, metricType),
      eq(playerCampaignStats.windowType, windowType),
    ]
    if (windowStart) {
      conditions.push(eq(playerCampaignStats.windowStart, windowStart))
    }
    const rows = await this.db
      .select()
      .from(playerCampaignStats)
      .where(and(...conditions))
      .limit(1)
    return rows[0] ?? null
  }

  async deleteByWindow(
    campaignId: string,
    windowType: typeof playerCampaignStats.windowType.enumValues[number],
    windowStart: Date,
  ): Promise<void> {
    await this.db
      .delete(playerCampaignStats)
      .where(
        and(
          eq(playerCampaignStats.campaignId, campaignId),
          eq(playerCampaignStats.windowType, windowType),
          eq(playerCampaignStats.windowStart, windowStart),
        ),
      )
  }
}
