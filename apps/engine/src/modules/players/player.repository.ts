import { eq, and, count, arrayContains } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { mockPlayers, mockSessions } from '@promotionos/db'
import type { VipTier } from './player.schema'

type Db = PostgresJsDatabase<typeof schema>

export interface CreatePlayerData {
  externalId: string
  displayName: string
  email?: string
  segmentTags: string[]
  vipTier: VipTier
  totalDepositsGel: number
  registrationDate: Date
}

export interface ListPlayersOptions {
  page: number
  limit: number
  vipTier?: VipTier
  segmentTag?: string
}

export interface CreateSessionData {
  playerId: string
  token: string
  expiresAt: Date
}

export class PlayerRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(mockPlayers)
      .where(eq(mockPlayers.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByExternalId(externalId: string) {
    const rows = await this.db
      .select()
      .from(mockPlayers)
      .where(eq(mockPlayers.externalId, externalId))
      .limit(1)
    return rows[0] ?? null
  }

  async list(options: ListPlayersOptions) {
    const offset = (options.page - 1) * options.limit

    const conditions = []
    if (options.vipTier) {
      conditions.push(eq(mockPlayers.vipTier, options.vipTier))
    }
    if (options.segmentTag) {
      conditions.push(arrayContains(mockPlayers.segmentTags, [options.segmentTag]))
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(mockPlayers)
        .where(whereClause)
        .limit(options.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(mockPlayers).where(whereClause),
    ])

    return {
      players: rows,
      total: Number(totalResult[0]?.count ?? 0),
    }
  }

  async create(data: CreatePlayerData) {
    const rows = await this.db
      .insert(mockPlayers)
      .values({
        externalId: data.externalId,
        displayName: data.displayName,
        email: data.email,
        segmentTags: data.segmentTags,
        vipTier: data.vipTier,
        totalDepositsGel: data.totalDepositsGel.toString(),
        registrationDate: data.registrationDate,
      })
      .returning()
    const player = rows[0]
    if (!player) throw new Error('Failed to create player')
    return player
  }

  async createSession(data: CreateSessionData) {
    const rows = await this.db
      .insert(mockSessions)
      .values({
        playerId: data.playerId,
        token: data.token,
        expiresAt: data.expiresAt,
      })
      .returning()
    const session = rows[0]
    if (!session) throw new Error('Failed to create session')
    return session
  }
}
