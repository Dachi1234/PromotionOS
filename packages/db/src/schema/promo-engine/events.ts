import {
  pgTable,
  pgEnum,
  uuid,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { timestamptz } from '../../helpers'
import { campaigns } from './campaigns'

export const eventTypeEnum = pgEnum('event_type', [
  'BET',
  'DEPOSIT',
  'REFERRAL',
  'LOGIN',
  'OPT_IN',
  'FREE_SPIN_USED',
  'MANUAL',
  'MECHANIC_OUTCOME',
])

export const rawEvents = pgTable('raw_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  eventType: eventTypeEnum('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').notNull().default(false),
  occurredAt: timestamptz('occurred_at').notNull(),
  receivedAt: timestamptz('received_at').notNull().defaultNow(),
}, (table) => ({
  playerEventTimeIdx: index('idx_raw_events_player_event_time')
    .on(table.playerId, table.eventType, table.occurredAt),
  unprocessedIdx: index('idx_raw_events_unprocessed')
    .on(table.occurredAt)
    .where(sql`processed = false`),
}))

export type RawEvent = typeof rawEvents.$inferSelect
export type NewRawEvent = typeof rawEvents.$inferInsert
