-- Campaign audit log for every mutating admin action on a campaign or
-- any of its child entities (mechanics, reward definitions, aggregation
-- rules).
--
-- Recorded on success AFTER the mutation commits. The writer is
-- best-effort — an audit-table outage must not block operator workflow —
-- so absent audit rows do not imply absent mutations.
--
-- `edit_kind` mirrors the editability policy (see
-- apps/engine/src/modules/editability/editability.policy.ts):
--   • `structural` — create/delete, type change, config-shape change.
--     Restricted to draft/scheduled campaigns.
--   • `tweak`      — the narrow set allowed while a campaign is
--                    active/paused (e.g. displayOrder, isActive,
--                    probabilityWeight, conditionConfig).
--
-- `patch_snapshot` stores the Zod-validated request patch body (pre-merge),
-- not the post-state row. Storing post-state would bloat with large
-- configs; the patch plus timestamp is enough to reconstruct intent.

CREATE TYPE "edit_kind" AS ENUM ('structural', 'tweak');

CREATE TABLE "campaign_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id"),
  "actor_user_id" uuid,
  "action_id" text NOT NULL,
  "edit_kind" "edit_kind" NOT NULL,
  "entity_type" text,
  "entity_id" uuid,
  "patch_snapshot" jsonb,
  "campaign_status_at_edit" "campaign_status" NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "idx_campaign_audit_log_campaign_created"
  ON "campaign_audit_log" ("campaign_id", "created_at");
