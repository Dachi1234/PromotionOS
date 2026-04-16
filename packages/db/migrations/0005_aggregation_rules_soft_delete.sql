-- Soft-delete support for aggregation_rules.
--
-- Background: rule reconciliation (see docs/PLAN.md Phase 1.2) needs to
-- "remove" rules that are no longer implied by a mechanic's config. Hard
-- DELETE risks breaking in-flight finalization jobs and orphaning audit
-- trails. Promotions produce money-equivalent outcomes, so we prefer a
-- tombstone over a destructive delete.
--
-- Every active-path query on aggregation_rules MUST filter on
-- `deleted_at IS NULL`. A partial index supports this efficiently.

ALTER TABLE "aggregation_rules"
  ADD COLUMN "deleted_at" timestamp with time zone;

-- Replace the all-rows indexes with partial indexes that only cover
-- non-deleted rows. This keeps trigger matching and campaign/mechanic
-- lookups fast while sidestepping the tombstones on every hot-path query.
DROP INDEX IF EXISTS "idx_agg_rules_source_event_type";
DROP INDEX IF EXISTS "idx_agg_rules_campaign_mechanic";

CREATE INDEX "idx_agg_rules_source_event_type"
  ON "aggregation_rules" ("source_event_type")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "idx_agg_rules_campaign_mechanic"
  ON "aggregation_rules" ("campaign_id", "mechanic_id")
  WHERE "deleted_at" IS NULL;
