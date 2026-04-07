import { pgTable, uuid, jsonb, primaryKey } from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { mechanics } from './mechanics'

export const playerMechanicState = pgTable(
  'player_mechanic_state',
  {
    playerId: uuid('player_id').notNull(),
    mechanicId: uuid('mechanic_id')
      .notNull()
      .references(() => mechanics.id, { onDelete: 'cascade' }),
    state: jsonb('state').notNull().default({}),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.mechanicId] }),
  }),
)

export type PlayerMechanicState = typeof playerMechanicState.$inferSelect
export type NewPlayerMechanicState = typeof playerMechanicState.$inferInsert
