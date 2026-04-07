import { eq, and, count } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { playerCampaignOptins } from '@promotionos/db'
import type { PlayerCampaignOptin } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class CampaignOptinRepository {
  constructor(private readonly db: Db) {}

  async findByPlayerAndCampaign(
    playerId: string,
    campaignId: string,
  ): Promise<PlayerCampaignOptin | null> {
    const rows = await this.db
      .select()
      .from(playerCampaignOptins)
      .where(
        and(
          eq(playerCampaignOptins.playerId, playerId),
          eq(playerCampaignOptins.campaignId, campaignId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  async create(playerId: string, campaignId: string): Promise<PlayerCampaignOptin> {
    const rows = await this.db
      .insert(playerCampaignOptins)
      .values({ playerId, campaignId })
      .returning()
    const row = rows[0]
    if (!row) throw new Error('Failed to create optin')
    return row
  }

  async countByCampaign(campaignId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(playerCampaignOptins)
      .where(eq(playerCampaignOptins.campaignId, campaignId))
    return Number(result[0]?.count ?? 0)
  }

  async isOptedIn(playerId: string, campaignId: string): Promise<boolean> {
    const row = await this.findByPlayerAndCampaign(playerId, campaignId)
    return row !== null
  }
}
