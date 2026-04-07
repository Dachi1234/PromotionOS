import {
  pgTable,
  uuid,
  text,
  jsonb,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns } from '../promo-engine/campaigns'

export const studioUsers = pgTable('studio_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('editor'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
})

export const wizardDrafts = pgTable('wizard_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => studioUsers.id),
  stepData: jsonb('step_data').notNull().default({}),
  lastSavedAt: timestamptz('last_saved_at').notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => studioUsers.id),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  diff: jsonb('diff'),
  occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
})

export type StudioUser = typeof studioUsers.$inferSelect
export type NewStudioUser = typeof studioUsers.$inferInsert
export type WizardDraft = typeof wizardDrafts.$inferSelect
export type NewWizardDraft = typeof wizardDrafts.$inferInsert
export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
