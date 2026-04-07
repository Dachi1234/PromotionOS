import { eq, and, desc, count } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { rawEvents } from '@promotionos/db'
import type { EventType } from './event.schema'

type Db = PostgresJsDatabase<typeof schema>

export interface CreateEventData {
  playerId: string
  campaignId?: string
  eventType: EventType
  payload: Record<string, unknown>
  occurredAt: Date
}

export interface ListEventsOptions {
  playerId?: string
  eventType?: EventType
  processed?: boolean
  page: number
  limit: number
}

export class EventRepository {
  constructor(private readonly db: Db) {}

  async create(data: CreateEventData) {
    const rows = await this.db
      .insert(rawEvents)
      .values({
        playerId: data.playerId,
        campaignId: data.campaignId,
        eventType: data.eventType,
        payload: data.payload,
        processed: false,
        occurredAt: data.occurredAt,
      })
      .returning()
    const event = rows[0]
    if (!event) throw new Error('Failed to create event')
    return event
  }

  async list(options: ListEventsOptions) {
    const offset = (options.page - 1) * options.limit

    const conditions = []

    if (options.playerId) {
      conditions.push(eq(rawEvents.playerId, options.playerId))
    }
    if (options.eventType) {
      conditions.push(eq(rawEvents.eventType, options.eventType))
    }
    if (options.processed !== undefined) {
      conditions.push(eq(rawEvents.processed, options.processed))
    }

    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : and(...conditions)
        : undefined

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(rawEvents)
        .where(whereClause)
        .orderBy(desc(rawEvents.receivedAt))
        .limit(options.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(rawEvents).where(whereClause),
    ])

    return {
      events: rows,
      total: Number(totalResult[0]?.count ?? 0),
    }
  }
}
