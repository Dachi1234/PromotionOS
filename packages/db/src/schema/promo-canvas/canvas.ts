import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from '../promo-engine/campaigns'

export const assetTypeEnum = pgEnum('asset_type', ['image', 'video'])

export const canvasConfigs = pgTable('canvas_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .unique()
    .references(() => campaigns.id),
  config: jsonb('config').notNull().default({}),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
})

export const canvasAssets = pgTable('canvas_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  url: text('url').notNull(),
  type: assetTypeEnum('type').notNull(),
  uploadedAt: timestamptz('uploaded_at').notNull().defaultNow(),
})

export type CanvasConfig = typeof canvasConfigs.$inferSelect
export type NewCanvasConfig = typeof canvasConfigs.$inferInsert
export type CanvasAsset = typeof canvasAssets.$inferSelect
export type NewCanvasAsset = typeof canvasAssets.$inferInsert
