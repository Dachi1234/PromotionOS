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
import { sql } from 'drizzle-orm'
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
  // Soft-delete tombstone. When non-null, the rule is considered retired:
  // the event pipeline skips it, but historical player_campaign_stats rows
  // that reference (source_event_type, metric) combinations remain valid
  // for audit / reporting. All active-path queries MUST filter on
  // `deletedAt IS NULL`. See docs on the `aggregation_rule_sync.service`.
  deletedAt: timestamptz('deleted_at'),
}, (table) => ({
  // Partial indexes: only live rules. Matches the predicate used by every
  // active-path query (see aggregation-rule.repository.ts). Keep the
  // `.where(...)` clause here in sync with migration
  // 0005_aggregation_rules_soft_delete.sql, otherwise `drizzle-kit
  // generate` will produce a spurious diff that rebuilds them as full
  // indexes.
  sourceEventTypeIdx: index('idx_agg_rules_source_event_type')
    .on(table.sourceEventType)
    .where(sql`${table.deletedAt} IS NULL`),
  campaignMechanicIdx: index('idx_agg_rules_campaign_mechanic')
    .on(table.campaignId, table.mechanicId)
    .where(sql`${table.deletedAt} IS NULL`),
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
