import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from './campaigns'

export const mechanicTypeEnum = pgEnum('mechanic_type', [
  'WHEEL',
  'WHEEL_IN_WHEEL',
  'LEADERBOARD',
  'LEADERBOARD_LAYERED',
  'MISSION',
  'PROGRESS_BAR',
  'CASHOUT',
  'TOURNAMENT',
])

export const mechanicRoleEnum = pgEnum('mechanic_role', ['primary', 'unlocked'])

export const mechanics = pgTable('mechanics', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  type: mechanicTypeEnum('type').notNull(),
  config: jsonb('config').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
}, (table) => ({
  campaignIdIdx: index('idx_mechanics_campaign_id').on(table.campaignId),
  campaignActiveIdx: index('idx_mechanics_campaign_active').on(table.campaignId, table.isActive),
}))

export const campaignMechanics = pgTable('campaign_mechanics', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  mechanicId: uuid('mechanic_id')
    .notNull()
    .references(() => mechanics.id),
  orderIndex: integer('order_index').notNull().default(0),
  role: mechanicRoleEnum('role').notNull().default('primary'),
})

export const mechanicDependencies = pgTable('mechanic_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  mechanicId: uuid('mechanic_id')
    .notNull()
    .references(() => mechanics.id),
  dependsOnMechanicId: uuid('depends_on_mechanic_id')
    .notNull()
    .references(() => mechanics.id),
  unlockCondition: jsonb('unlock_condition').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export type Mechanic = typeof mechanics.$inferSelect
export type NewMechanic = typeof mechanics.$inferInsert
export type CampaignMechanic = typeof campaignMechanics.$inferSelect
export type NewCampaignMechanic = typeof campaignMechanics.$inferInsert
export type MechanicDependency = typeof mechanicDependencies.$inferSelect
export type NewMechanicDependency = typeof mechanicDependencies.$inferInsert
