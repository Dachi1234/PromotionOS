import {
  pgTable,
  pgEnum,
  uuid,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'
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
})

export type RawEvent = typeof rawEvents.$inferSelect
export type NewRawEvent = typeof rawEvents.$inferInsert
