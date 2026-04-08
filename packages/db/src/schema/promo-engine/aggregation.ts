import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  numeric,
  text,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from './campaigns'
import { mechanics } from './mechanics'
import { eventTypeEnum } from './events'

export const metricEnum = pgEnum('metric_type_enum', [
  'COUNT',
  'SUM',
  'AVERAGE',
])

export const windowTypeEnum = pgEnum('window_type', [
  'minute',
  'hourly',
  'daily',
  'weekly',
  'campaign',
  'rolling',
])

export const aggregationRules = pgTable('aggregation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  mechanicId: uuid('mechanic_id')
    .notNull()
    .references(() => mechanics.id),
  sourceEventType: eventTypeEnum('source_event_type').notNull(),
  metric: metricEnum('metric').notNull(),
  transformation: jsonb('transformation').notNull(),
  windowType: windowTypeEnum('window_type').notNull(),
  windowSizeHours: integer('window_size_hours'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}, (table) => ({
  sourceEventTypeIdx: index('idx_agg_rules_source_event_type').on(table.sourceEventType),
  campaignMechanicIdx: index('idx_agg_rules_campaign_mechanic').on(table.campaignId, table.mechanicId),
}))

export const playerCampaignStats = pgTable(
  'player_campaign_stats',
  {
    playerId: uuid('player_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    mechanicId: uuid('mechanic_id')
      .notNull()
      .references(() => mechanics.id),
    metricType: text('metric_type').notNull(),
    windowType: windowTypeEnum('window_type').notNull(),
    windowStart: timestamptz('window_start').notNull(),
    value: numeric('value', { precision: 18, scale: 4 }).notNull().default('0'),
    sampleCount: integer('sample_count').notNull().default(0),
    lastUpdatedAt: timestamptz('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.playerId,
        table.campaignId,
        table.mechanicId,
        table.metricType,
        table.windowType,
        table.windowStart,
      ],
    }),
    leaderboardIdx: index('idx_pcs_leaderboard')
      .on(table.campaignId, table.mechanicId, table.metricType, table.windowType, table.windowStart),
    playerCampaignIdx: index('idx_pcs_player_campaign')
      .on(table.playerId, table.campaignId),
  }),
)

export type AggregationRule = typeof aggregationRules.$inferSelect
export type NewAggregationRule = typeof aggregationRules.$inferInsert
export type PlayerCampaignStat = typeof playerCampaignStats.$inferSelect
export type NewPlayerCampaignStat = typeof playerCampaignStats.$inferInsert
