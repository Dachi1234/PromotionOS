import { eq, and, asc, gte, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { rawEvents } from '@promotionos/db'
import type { RawEvent } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class RawEventRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<RawEvent | null> {
    const rows = await this.db
      .select()
      .from(rawEvents)
      .where(eq(rawEvents.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async fetchUnprocessedBatch(batchSize: number): Promise<RawEvent[]> {
    return this.db
      .select()
      .from(rawEvents)
      .where(eq(rawEvents.processed, false))
      .orderBy(asc(rawEvents.occurredAt))
      .limit(batchSize)
  }

  async markProcessed(id: string): Promise<void> {
    await this.db
      .update(rawEvents)
      .set({ processed: true })
      .where(eq(rawEvents.id, id))
  }

  async fetchEventsInWindow(
    playerId: string,
    eventType: typeof rawEvents.eventType.enumValues[number],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<RawEvent[]> {
    return this.db
      .select()
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.playerId, playerId),
          eq(rawEvents.eventType, eventType),
          gte(rawEvents.occurredAt, windowStart),
          lte(rawEvents.occurredAt, windowEnd),
        ),
      )
      .orderBy(asc(rawEvents.occurredAt))
  }
}
