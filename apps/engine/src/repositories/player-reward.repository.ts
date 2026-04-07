import { eq, and, gte, count, desc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { playerRewards } from '@promotionos/db'
import type { PlayerReward, NewPlayerReward } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class PlayerRewardRepository {
  constructor(private readonly db: Db) {}

  async create(data: NewPlayerReward): Promise<PlayerReward> {
    const rows = await this.db.insert(playerRewards).values(data).returning()
    const row = rows[0]
    if (!row) throw new Error('Failed to create player reward')
    return row
  }

  async findById(id: string): Promise<PlayerReward | null> {
    const rows = await this.db
      .select()
      .from(playerRewards)
      .where(eq(playerRewards.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async countByMechanicAndPlayer(mechanicId: string, playerId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(playerRewards)
      .where(
        and(
          eq(playerRewards.mechanicId, mechanicId),
          eq(playerRewards.playerId, playerId),
        ),
      )
    return Number(result[0]?.count ?? 0)
  }

  async countByMechanicAndPlayerSince(
    mechanicId: string,
    playerId: string,
    since: Date,
  ): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(playerRewards)
      .where(
        and(
          eq(playerRewards.mechanicId, mechanicId),
          eq(playerRewards.playerId, playerId),
          gte(playerRewards.grantedAt, since),
        ),
      )
    return Number(result[0]?.count ?? 0)
  }

  async findLastByMechanicAndPlayer(
    mechanicId: string,
    playerId: string,
  ): Promise<PlayerReward | null> {
    const rows = await this.db
      .select()
      .from(playerRewards)
      .where(
        and(
          eq(playerRewards.mechanicId, mechanicId),
          eq(playerRewards.playerId, playerId),
        ),
      )
      .orderBy(desc(playerRewards.grantedAt))
      .limit(1)
    return rows[0] ?? null
  }

  async findConditionPendingByPlayerAndCampaign(
    playerId: string,
    campaignId: string,
  ): Promise<PlayerReward[]> {
    return this.db
      .select()
      .from(playerRewards)
      .where(
        and(
          eq(playerRewards.playerId, playerId),
          eq(playerRewards.campaignId, campaignId),
          eq(playerRewards.status, 'condition_pending'),
        ),
      )
  }

  async findExpiredConditionPending(): Promise<PlayerReward[]> {
    return this.db
      .select()
      .from(playerRewards)
      .where(eq(playerRewards.status, 'condition_pending'))
  }

  async updateStatus(id: string, status: PlayerReward['status'], extra?: Partial<PlayerReward>): Promise<void> {
    await this.db
      .update(playerRewards)
      .set({ status, ...extra })
      .where(eq(playerRewards.id, id))
  }

  async updateConditionSnapshot(id: string, snapshot: unknown): Promise<void> {
    await this.db
      .update(playerRewards)
      .set({ conditionSnapshot: snapshot })
      .where(eq(playerRewards.id, id))
  }
}
