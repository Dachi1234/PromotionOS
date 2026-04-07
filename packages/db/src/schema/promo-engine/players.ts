import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'

export const vipTierEnum = pgEnum('vip_tier', [
  'bronze',
  'silver',
  'gold',
  'platinum',
])

export const mockPlayers = pgTable('mock_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email'),
  segmentTags: text('segment_tags').array().notNull().default([]),
  vipTier: vipTierEnum('vip_tier').notNull().default('bronze'),
  totalDepositsGel: numeric('total_deposits_gel', {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default('0'),
  registrationDate: timestamptz('registration_date').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export const mockSessions = pgTable('mock_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => mockPlayers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamptz('expires_at').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export type MockPlayer = typeof mockPlayers.$inferSelect
export type NewMockPlayer = typeof mockPlayers.$inferInsert
export type MockSession = typeof mockSessions.$inferSelect
export type NewMockSession = typeof mockSessions.$inferInsert
