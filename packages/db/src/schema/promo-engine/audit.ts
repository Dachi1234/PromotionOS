import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { timestamptz } from '../../helpers'
import { campaigns, campaignStatusEnum } from './campaigns'

/**
 * Audit log for every mutating admin action against a campaign or any of
 * its child entities (mechanics, reward definitions, aggregation rules).
 *
 * Recorded on success, AFTER the mutation commits. Missing audit rows do
 * not imply absent mutations — the writer is best-effort and failures to
 * write are logged but not raised, so an audit-table outage cannot block
 * operator workflows. Treat this as "log, not ledger".
 *
 * The `edit_kind` column mirrors `editability.policy` — `structural`
 * edits are those restricted to draft/scheduled campaigns; `tweak` edits
 * are the narrow set allowed while the campaign is active/paused.
 *
 * `patch_snapshot` stores the proposed patch body (Zod-validated, before
 * merge) — NOT the full post-mutation row. Storing the post-state would
 * bloat the log with large configs; the patch is enough to reconstruct
 * intent alongside the mutation timestamp.
 */

export const editKindEnum = pgEnum('edit_kind', ['structural', 'tweak'])

export const campaignAuditLog = pgTable(
  'campaign_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    actorUserId: uuid('actor_user_id'),
    actionId: text('action_id').notNull(),
    editKind: editKindEnum('edit_kind').notNull(),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    patchSnapshot: jsonb('patch_snapshot'),
    campaignStatusAtEdit: campaignStatusEnum('campaign_status_at_edit').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (table) => ({
    campaignCreatedIdx: index('idx_campaign_audit_log_campaign_created')
      .on(table.campaignId, table.createdAt),
  }),
)

export type CampaignAuditLog = typeof campaignAuditLog.$inferSelect
export type NewCampaignAuditLog = typeof campaignAuditLog.$inferInsert
