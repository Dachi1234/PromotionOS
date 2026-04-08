import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'active',
  'paused',
  'ended',
  'archived',
])

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  status: campaignStatusEnum('status').notNull().default('draft'),
  targetSegmentId: uuid('target_segment_id'),
  currency: text('currency').notNull().default('GEL'),
  startsAt: timestamptz('starts_at').notNull(),
  endsAt: timestamptz('ends_at').notNull(),
  canvasConfig: jsonb('canvas_config'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('idx_campaigns_status').on(table.status),
  statusScheduleIdx: index('idx_campaigns_status_schedule').on(table.status, table.startsAt, table.endsAt),
}))

export const campaignSegments = pgTable('campaign_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name'),
  segmentRuleConfig: jsonb('segment_rule_config').notNull(),
  playerIds: uuid('player_ids').array(),
  snapshotAt: timestamptz('snapshot_at'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
export type CampaignSegment = typeof campaignSegments.$inferSelect
export type NewCampaignSegment = typeof campaignSegments.$inferInsert
