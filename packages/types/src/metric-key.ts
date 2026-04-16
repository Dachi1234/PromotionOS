/**
 * Shared metric-key registry.
 *
 * A "metric key" is the `{EVENT_TYPE}_{METRIC}` identifier operators and
 * studio UIs reference when configuring mechanics — e.g. `BET_SUM`,
 * `LOGIN_COUNT`, `MECHANIC_OUTCOME_SUM`. Every such key must correspond
 * to an `aggregation_rules` row so the event pipeline knows to populate
 * `player_campaign_stats` for that (source, metric, window) tuple.
 *
 * Previously the registry lived inside
 * `apps/engine/src/services/mechanics/aggregation-rule-inference.service.ts`,
 * which made it hard for the studio wizard / canvas UI to validate
 * against the same source of truth. This module centralises it so every
 * consumer (engine, studio, canvas, any future CLI) gets identical
 * behavior.
 *
 * The registry is built programmatically from the cartesian product of
 * `eventTypeSchema.options × metricEnumSchema.options`. Adding a new
 * event type or metric in `@promotionos/zod-schemas` automatically
 * extends the registry — one place to update.
 */

import { eventTypeSchema, metricEnumSchema } from '@promotionos/zod-schemas'
import type { EventType } from './event.types'
import type { Metric } from './aggregation.types'

// `EventType` and `Metric` are re-derived from the same Zod enums in
// `event.types.ts` and `aggregation.types.ts` respectively. Importing
// them here (instead of re-declaring) keeps a single canonical type
// and avoids duplicate-export errors at the package root.

export const EVENT_TYPES: readonly EventType[] = eventTypeSchema.options as readonly EventType[]
export const METRICS: readonly Metric[] = metricEnumSchema.options as readonly Metric[]

export interface MetricKeyDescriptor {
  readonly key: string
  readonly source: EventType
  readonly metric: Metric
}

function buildRegistry(): ReadonlyMap<string, MetricKeyDescriptor> {
  const m = new Map<string, MetricKeyDescriptor>()
  for (const source of EVENT_TYPES) {
    for (const metric of METRICS) {
      const key = `${source}_${metric}`
      m.set(key, { key, source, metric })
    }
  }
  return m
}

/**
 * Map from `{SOURCE}_{METRIC}` string → descriptor. Built once at module
 * load. Readonly — callers must not mutate.
 */
export const METRIC_KEY_REGISTRY: ReadonlyMap<string, MetricKeyDescriptor> =
  buildRegistry()

/** All valid metric keys as a sorted readonly array. Useful for UI enums. */
export const METRIC_KEYS: readonly string[] = Array.from(METRIC_KEY_REGISTRY.keys()).sort()

export function parseMetricKey(key: string): MetricKeyDescriptor | null {
  return METRIC_KEY_REGISTRY.get(key) ?? null
}

export function isValidMetricKey(key: unknown): key is string {
  return typeof key === 'string' && METRIC_KEY_REGISTRY.has(key)
}
