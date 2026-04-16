/**
 * Full reconciliation of aggregation rules against a mechanic's current
 * config. Unlike `syncInferredRulesForMechanic` (additive-only), this
 * service also retires rules no longer implied by the config and
 * replaces rules whose window shape changed.
 *
 * Semantics — diff key: `(sourceEventType, metric)` on live rules only.
 *
 *   desired only        → INSERT new live rule  (default transformation)
 *   live only           → tombstone (SET deleted_at = now())
 *   both, window equal  → UNCHANGED (no write)
 *   both, window differs→ tombstone old + INSERT new (carry transformation)
 *
 * `transformation` is preserved across a window-change replacement because
 * it is operator-authored and orthogonal to what inference decides
 * (inference only sets sourceEventType / metric / windowType).
 *
 * All writes run in a single transaction. If any write fails the entire
 * diff is rolled back — the repository invariant ("active path sees a
 * consistent rule set") is preserved even under partial failure.
 *
 * Intended caller: the PUT mechanic handler, after config validation and
 * `inferRequiredRules` have succeeded. POST stays on the additive sync
 * service (no prior live rules can exist for a brand-new mechanic, so
 * the reconciler would be equivalent but more expensive).
 */

import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { aggregationRules } from '@promotionos/db'
import type { InferredRule } from './aggregation-rule-inference.service'

type Db = PostgresJsDatabase<typeof schema>

export interface ReconcileResult {
  /** Rules newly inserted because the config now implies them. */
  inserted: InferredRule[]
  /** Rules soft-deleted because the config no longer implies them. */
  tombstoned: Array<{ id: string; sourceEventType: string; metric: string }>
  /**
   * Rules whose window shape changed. The previous row was tombstoned and
   * a new live row inserted carrying the prior `transformation`.
   */
  replaced: InferredRule[]
  /** Rules already correct for this config — no write performed. */
  unchanged: InferredRule[]
}

const DEFAULT_TRANSFORMATION = [{ operation: 'NONE', field: 'amount' }] as const

/**
 * Does the live rule's window shape still satisfy the desired inference?
 *
 * Inference currently never emits `windowSizeHours` (today it only sets
 * `windowType`). An operator may have set a size on the live rule — e.g.
 * `rolling` window with 24h. On an unrelated config edit we must NOT
 * tombstone that customization. So we treat null desired size as
 * "don't care" and only require `windowType` to match.
 *
 * When inference starts emitting `windowSizeHours`, update this to a
 * strict equality check and revisit the replace path below.
 */
function windowStillMatches(
  live: { windowType: string; windowSizeHours: number | null },
  desired: { windowType: string; windowSizeHours: number | null },
): boolean {
  if (live.windowType !== desired.windowType) return false
  if (desired.windowSizeHours === null) return true
  return live.windowSizeHours === desired.windowSizeHours
}

export async function reconcileInferredRulesForMechanic(
  db: Db,
  campaignId: string,
  mechanicId: string,
  inferred: InferredRule[],
): Promise<ReconcileResult> {
  return db.transaction(async (tx) => {
    const live = await tx
      .select({
        id: aggregationRules.id,
        sourceEventType: aggregationRules.sourceEventType,
        metric: aggregationRules.metric,
        windowType: aggregationRules.windowType,
        windowSizeHours: aggregationRules.windowSizeHours,
        transformation: aggregationRules.transformation,
      })
      .from(aggregationRules)
      .where(
        and(
          eq(aggregationRules.mechanicId, mechanicId),
          isNull(aggregationRules.deletedAt),
        ),
      )

    const keyOf = (r: { sourceEventType: string; metric: string }) =>
      `${r.sourceEventType}|${r.metric}`

    const liveByKey = new Map(live.map((r) => [keyOf(r), r]))
    const desiredByKey = new Map<string, InferredRule>()
    // De-dup desired by (source, metric) — if inference ever emits two
    // entries with the same (source, metric) but different windowType
    // (shouldn't happen today, but defensive), first one wins.
    for (const r of inferred) {
      const k = keyOf(r)
      if (!desiredByKey.has(k)) desiredByKey.set(k, r)
    }

    const inserted: InferredRule[] = []
    const tombstoned: ReconcileResult['tombstoned'] = []
    const replaced: InferredRule[] = []
    const unchanged: InferredRule[] = []

    // 1. Desired ∖ live → insert new
    // 2. Desired ∩ live, window differs → tombstone + re-insert (carrying transformation)
    // 3. Desired ∩ live, window equal → unchanged
    const toInsertValues: Array<typeof aggregationRules.$inferInsert> = []
    const idsToTombstone: string[] = []

    for (const [key, desired] of desiredByKey) {
      const current = liveByKey.get(key)
      if (!current) {
        inserted.push(desired)
        toInsertValues.push({
          campaignId,
          mechanicId,
          sourceEventType: desired.sourceEventType,
          metric: desired.metric,
          windowType: desired.windowType,
          transformation: DEFAULT_TRANSFORMATION as unknown as object,
        })
        continue
      }

      if (
        windowStillMatches(
          { windowType: current.windowType, windowSizeHours: current.windowSizeHours },
          { windowType: desired.windowType, windowSizeHours: null },
        )
      ) {
        unchanged.push(desired)
        continue
      }

      // Window shape changed — tombstone old, insert new carrying transformation.
      replaced.push(desired)
      idsToTombstone.push(current.id)
      toInsertValues.push({
        campaignId,
        mechanicId,
        sourceEventType: desired.sourceEventType,
        metric: desired.metric,
        windowType: desired.windowType,
        transformation: current.transformation as object,
      })
    }

    // 4. Live ∖ desired → tombstone (config no longer implies them)
    for (const [key, current] of liveByKey) {
      if (desiredByKey.has(key)) continue
      idsToTombstone.push(current.id)
      tombstoned.push({
        id: current.id,
        sourceEventType: current.sourceEventType,
        metric: current.metric,
      })
    }

    const now = new Date()
    if (idsToTombstone.length > 0) {
      // Drizzle's `inArray` would be cleaner, but we avoid pulling an extra
      // import by iterating — the list is bounded by the number of metric
      // keys implied by a mechanic config (single digits in practice).
      for (const id of idsToTombstone) {
        await tx
          .update(aggregationRules)
          .set({ deletedAt: now })
          .where(
            and(
              eq(aggregationRules.id, id),
              isNull(aggregationRules.deletedAt),
            ),
          )
      }
    }

    if (toInsertValues.length > 0) {
      await tx.insert(aggregationRules).values(toInsertValues)
    }

    return { inserted, tombstoned, replaced, unchanged }
  })
}
