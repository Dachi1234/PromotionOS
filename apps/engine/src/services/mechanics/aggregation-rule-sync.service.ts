/**
 * Persist inferred aggregation rules for a mechanic.
 *
 * Works with the output of `inferRequiredRules(type, config)` and writes
 * any missing rows to `aggregation_rules`. Idempotent — rules that
 * already exist are left untouched.
 *
 * Dedup key: (mechanicId, sourceEventType, metric). If a rule with those
 * three fields already exists — even with a different windowType or
 * transformation — this service will NOT overwrite it. Changing those
 * fields requires explicit full reconciliation via the PUT
 * rule-sync endpoint (see Phase 1.2).
 */

import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { aggregationRules } from '@promotionos/db'
import type { InferredRule } from './aggregation-rule-inference.service'

type Db = PostgresJsDatabase<typeof schema>

export interface SyncResult {
  inserted: InferredRule[]
  skipped: InferredRule[]
}

/**
 * Default transformation used for auto-injected rules.
 *
 * `NONE` with `field: 'amount'` means: take the event's `amount` payload
 * field verbatim and aggregate it. This matches what the studio wizard
 * has historically injected and what operators would manually create
 * for the common case.
 *
 * If an operator needs a non-trivial transformation (MULTIPLY, CAP,
 * PERCENTAGE) they should create the rule explicitly via the
 * aggregation-rules POST endpoint BEFORE creating the mechanic — in
 * that case inference will see the existing rule and skip it.
 */
const DEFAULT_TRANSFORMATION = [{ operation: 'NONE', field: 'amount' }] as const

export async function syncInferredRulesForMechanic(
  db: Db,
  campaignId: string,
  mechanicId: string,
  inferred: InferredRule[],
): Promise<SyncResult> {
  if (inferred.length === 0) {
    return { inserted: [], skipped: [] }
  }

  // Only live rules count for dedup. If a rule was soft-deleted and the
  // mechanic's config now implies it again, we want to re-create it as a
  // fresh live row — the tombstone must not silently suppress re-insert.
  const existing = await db
    .select({
      sourceEventType: aggregationRules.sourceEventType,
      metric: aggregationRules.metric,
    })
    .from(aggregationRules)
    .where(
      and(
        eq(aggregationRules.mechanicId, mechanicId),
        isNull(aggregationRules.deletedAt),
      ),
    )

  const existingKeys = new Set(
    existing.map((r) => `${r.sourceEventType}|${r.metric}`),
  )

  const inserted: InferredRule[] = []
  const skipped: InferredRule[] = []

  for (const rule of inferred) {
    const key = `${rule.sourceEventType}|${rule.metric}`
    if (existingKeys.has(key)) {
      skipped.push(rule)
    } else {
      inserted.push(rule)
      // Track locally so that if `inferred` contains duplicates by this
      // same key we don't try to insert twice. (The inference service
      // dedups by (source, metric, window), so two rules with the same
      // source+metric but different window types could slip through.
      // Defensive — first one wins.)
      existingKeys.add(key)
    }
  }

  if (inserted.length === 0) {
    return { inserted: [], skipped }
  }

  await db.insert(aggregationRules).values(
    inserted.map((r) => ({
      campaignId,
      mechanicId,
      sourceEventType: r.sourceEventType,
      metric: r.metric,
      windowType: r.windowType,
      transformation: DEFAULT_TRANSFORMATION as unknown as object,
    })),
  )

  return { inserted, skipped }
}
