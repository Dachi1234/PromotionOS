import { eq, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { playerMechanicState } from '@promotionos/db'
import type { PlayerMechanicState } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class PlayerMechanicStateRepository {
  constructor(private readonly db: Db) {}

  async findByPlayerAndMechanic(
    playerId: string,
    mechanicId: string,
  ): Promise<PlayerMechanicState | null> {
    const rows = await this.db
      .select()
      .from(playerMechanicState)
      .where(
        and(
          eq(playerMechanicState.playerId, playerId),
          eq(playerMechanicState.mechanicId, mechanicId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  async upsert(playerId: string, mechanicId: string, state: unknown): Promise<void> {
    await this.db
      .insert(playerMechanicState)
      .values({ playerId, mechanicId, state, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [playerMechanicState.playerId, playerMechanicState.mechanicId],
        set: { state, updatedAt: new Date() },
      })
  }
}
