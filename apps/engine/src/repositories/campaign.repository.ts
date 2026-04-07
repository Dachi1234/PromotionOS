import { eq, and, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { campaigns, campaignSegments, mockPlayers } from '@promotionos/db'
import type { Campaign, MockPlayer } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class CampaignSchedulerRepository {
  constructor(private readonly db: Db) {}

  async findScheduledReadyToActivate(now: Date): Promise<Campaign[]> {
    return this.db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'scheduled'),
          lte(campaigns.startsAt, now),
        ),
      )
  }

  async findActiveReadyToEnd(now: Date): Promise<Campaign[]> {
    return this.db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'active'),
          lte(campaigns.endsAt, now),
        ),
      )
  }

  async updateStatus(
    id: string,
    status: typeof campaigns.status.enumValues[number],
  ): Promise<Campaign | null> {
    const rows = await this.db
      .update(campaigns)
      .set({ status, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning()
    return rows[0] ?? null
  }

  async findCampaignSegment(campaignId: string) {
    const rows = await this.db
      .select()
      .from(campaignSegments)
      .where(eq(campaignSegments.campaignId, campaignId))
      .limit(1)
    return rows[0] ?? null
  }

  async upsertCampaignSegment(
    campaignId: string,
    playerIds: string[],
    segmentRuleConfig: unknown,
  ): Promise<void> {
    await this.db
      .insert(campaignSegments)
      .values({
        campaignId,
        segmentRuleConfig,
        playerIds,
        snapshotAt: new Date(),
      })
  }

  async getAllPlayers(): Promise<MockPlayer[]> {
    return this.db.select().from(mockPlayers)
  }

  async findActiveCampaigns(): Promise<Campaign[]> {
    return this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.status, 'active'))
  }
}
