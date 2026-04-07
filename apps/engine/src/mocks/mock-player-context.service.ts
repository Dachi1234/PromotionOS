import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { mockPlayers, mockSessions } from '@promotionos/db'
import type { IPlayerContextService, PlayerContext } from '../interfaces/player-context.interface'

type Db = PostgresJsDatabase<typeof schema>

function mapToPlayerContext(
  player: typeof mockPlayers.$inferSelect,
): PlayerContext {
  return {
    id: player.id,
    externalId: player.externalId,
    displayName: player.displayName,
    email: player.email ?? undefined,
    segmentTags: player.segmentTags ?? [],
    vipTier: player.vipTier,
    totalDepositsGel: parseFloat(player.totalDepositsGel ?? '0'),
    registrationDate: player.registrationDate,
  }
}

export class MockPlayerContextService implements IPlayerContextService {
  constructor(private readonly db: Db) {}

  async getPlayerBySession(sessionToken: string): Promise<PlayerContext | null> {
    const now = new Date()

    const rows = await this.db
      .select({
        session: mockSessions,
        player: mockPlayers,
      })
      .from(mockSessions)
      .innerJoin(mockPlayers, eq(mockSessions.playerId, mockPlayers.id))
      .where(eq(mockSessions.token, sessionToken))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    if (row.session.expiresAt <= now) return null

    return mapToPlayerContext(row.player)
  }

  async getPlayerById(id: string): Promise<PlayerContext | null> {
    const rows = await this.db
      .select()
      .from(mockPlayers)
      .where(eq(mockPlayers.id, id))
      .limit(1)

    const player = rows[0]
    if (!player) return null

    return mapToPlayerContext(player)
  }
}
