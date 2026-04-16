/**
 * Best-effort writer for `campaign_audit_log`.
 *
 * Called AFTER a mutation commits so the log reflects what actually
 * happened, not what was attempted. Failures here are logged and
 * swallowed — the audit table outage must not block an operator from
 * changing reward weights, so we prefer a missing row to a raised 500.
 *
 * Consumers: `mechanic.routes.ts`, `campaign.service.ts`. If you need
 * to add a new call site, match the shape of an existing one and pick
 * a stable `action.actionId` (dotted form, e.g. `mechanic.create`).
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { FastifyBaseLogger } from 'fastify'
import type * as schema from '@promotionos/db'
import { campaignAuditLog } from '@promotionos/db'
import type { CampaignStatus, EditAction } from '../editability/editability.policy'

type Db = PostgresJsDatabase<typeof schema>

export interface RecordEditInput {
  campaignId: string
  campaignStatusAtEdit: CampaignStatus
  actorUserId: string | null
  action: EditAction
  entityType?: string
  entityId?: string
  /** The Zod-validated request patch body, pre-merge. */
  patchSnapshot?: unknown
}

export async function recordEdit(
  db: Db,
  log: FastifyBaseLogger,
  input: RecordEditInput,
): Promise<void> {
  try {
    await db.insert(campaignAuditLog).values({
      campaignId: input.campaignId,
      actorUserId: input.actorUserId,
      actionId: input.action.actionId,
      editKind: input.action.kind,
      entityType: input.entityType,
      entityId: input.entityId,
      patchSnapshot: (input.patchSnapshot ?? null) as object | null,
      campaignStatusAtEdit: input.campaignStatusAtEdit,
    })
  } catch (err) {
    // Best-effort: log and continue. Missing audit rows do not imply
    // the mutation didn't happen.
    log.warn(
      {
        err,
        campaignId: input.campaignId,
        actionId: input.action.actionId,
      },
      'Failed to write campaign audit log row',
    )
  }
}
