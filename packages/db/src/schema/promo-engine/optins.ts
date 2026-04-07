import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from './campaigns'

export const playerCampaignOptins = pgTable(
  'player_campaign_optins',
  {
    playerId: uuid('player_id').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    optedInAt: timestamptz('opted_in_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.campaignId] }),
  }),
)

export type PlayerCampaignOptin = typeof playerCampaignOptins.$inferSelect
export type NewPlayerCampaignOptin = typeof playerCampaignOptins.$inferInsert
