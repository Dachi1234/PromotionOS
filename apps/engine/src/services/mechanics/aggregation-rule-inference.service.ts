/**
 * Aggregation-rule inference.
 *
 * Given a mechanic's type and config, derive the set of aggregation rules
 * that MUST exist for it to function correctly.
 *
 * Background: several mechanic types (LEADERBOARD, PROGRESS_BAR, MISSION,
 * LEADERBOARD_LAYERED) reference metric keys like `BET_SUM`, `LOGIN_COUNT`,
 * `MECHANIC_OUTCOME_SUM`. Each such key requires a matching row in
 * `aggregation_rules` so the event pipeline knows to populate
 * `player_campaign_stats` for that (sourceEventType, metric, windowType).
 *
 * Historically this was the operator's responsibility, and forgetting to
 * add the rule produced a silent "why isn't my leaderboard updating?"
 * bug. The studio wizard later added client-side auto-injection, but that
 * fix doesn't apply to any non-wizard client (API tests, future CLIs).
 * This service moves the inference into the engine so every path gets it.
 *
 * Pure function — no DB access. See `aggregation-rule-sync.service.ts`
 * for the persistence side.
 */

import type { z } from 'zod'
import type { mechanicTypeSchema } from '@promotionos/zod-schemas'
import {
  parseMetricKey,
  isValidMetricKey,
  METRIC_KEYS,
  type EventType,
  type Metric,
} from '@promotionos/types'

type MechanicType = z.infer<typeof mechanicTypeSchema>

// Metric-key registry now lives in `@promotionos/types` so the studio
// wizard and any future CLIs can validate against the same source of
// truth. Re-export the public surface for callers already importing
// from this service.
export type { EventType, Metric } from '@promotionos/types'
export { parseMetricKey, isValidMetricKey, METRIC_KEYS }

// WindowType is only used by the engine today — the studio wizard lets
// operators pick windowType per-rule, not per-metric-key. Keep it local.
export type WindowType =
  | 'minute'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'campaign'
  | 'rolling'

export interface InferredRule {
  sourceEventType: EventType
  metric: Metric
  windowType: WindowType
}

const WINDOW_TYPES: readonly WindowType[] = [
  'minute',
  'hourly',
  'daily',
  'weekly',
  'campaign',
  'rolling',
]

export function isValidWindowType(value: unknown): value is WindowType {
  return typeof value === 'string' && (WINDOW_TYPES as readonly string[]).includes(value)
}

export class UnknownMetricKeyError extends Error {
  constructor(
    public readonly key: string,
    public readonly field: string,
  ) {
    super(
      `Unknown metric key '${key}' in field '${field}'. ` +
        `Valid keys are {EVENT_TYPE}_{METRIC} combinations, e.g. BET_SUM, LOGIN_COUNT, MECHANIC_OUTCOME_SUM.`,
    )
    this.name = 'UnknownMetricKeyError'
  }
}

export class InvalidWindowTypeError extends Error {
  constructor(
    public readonly value: unknown,
    public readonly field: string,
  ) {
    super(
      `Invalid windowType '${String(value)}' in field '${field}'. ` +
        `Valid values: ${WINDOW_TYPES.join(', ')}.`,
    )
    this.name = 'InvalidWindowTypeError'
  }
}

/**
 * Derive the set of aggregation rules that must exist for the given
 * mechanic config to function correctly.
 *
 * Contract:
 * - Input config MUST already be Zod-validated for the mechanic type.
 *   (Caller is responsible — the POST/PUT mechanic routes do this.)
 * - Throws `UnknownMetricKeyError` if any referenced metric key isn't
 *   in the registry. This prevents silently-broken mechanics.
 * - Output is deduplicated by (sourceEventType, metric, windowType).
 * - Mechanic types that don't consume aggregated stats (WHEEL, CASHOUT)
 *   return an empty list.
 */
export function inferRequiredRules(
  type: MechanicType,
  config: unknown,
): InferredRule[] {
  const cfg = config as Record<string, unknown>
  const collected: InferredRule[] = []

  const addFromKey = (
    rawKey: unknown,
    rawWindow: unknown,
    fieldPath: string,
    defaultWindow: WindowType = 'campaign',
  ): void => {
    if (typeof rawKey !== 'string' || rawKey.length === 0) return
    const parsed = parseMetricKey(rawKey)
    if (!parsed) throw new UnknownMetricKeyError(rawKey, fieldPath)

    let windowType: WindowType
    if (rawWindow === undefined || rawWindow === null) {
      windowType = defaultWindow
    } else if (isValidWindowType(rawWindow)) {
      windowType = rawWindow
    } else {
      throw new InvalidWindowTypeError(rawWindow, fieldPath)
    }

    collected.push({
      sourceEventType: parsed.source,
      metric: parsed.metric,
      windowType,
    })
  }

  switch (type) {
    case 'LEADERBOARD': {
      addFromKey(cfg.ranking_metric, cfg.window_type, 'ranking_metric')
      addFromKey(cfg.secondary_metric, cfg.window_type, 'secondary_metric')
      break
    }
    case 'LEADERBOARD_LAYERED': {
      for (const layerKey of ['leaderboard_1', 'leaderboard_2'] as const) {
        const lb = cfg[layerKey] as Record<string, unknown> | undefined
        if (!lb) continue
        addFromKey(lb.ranking_metric, lb.window_type, `${layerKey}.ranking_metric`)
        addFromKey(lb.secondary_metric, lb.window_type, `${layerKey}.secondary_metric`)
      }
      break
    }
    case 'PROGRESS_BAR': {
      addFromKey(cfg.metric_type, cfg.window_type, 'metric_type')
      break
    }
    case 'MISSION': {
      const steps = (cfg.steps as Array<Record<string, unknown>> | undefined) ?? []
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!
        // MissionService always reads step progress from campaign-window stats,
        // so we pin windowType here regardless of any value on the step.
        addFromKey(step.metric_type, 'campaign', `steps[${i}].metric_type`, 'campaign')
      }
      break
    }
    default:
      // WHEEL, WHEEL_IN_WHEEL, CASHOUT: no aggregation rules derivable
      // from config. They may have rules via explicit operator action,
      // which is fine — inference is purely additive.
      break
  }

  // Dedup by the natural uniqueness tuple.
  const seen = new Set<string>()
  return collected.filter((r) => {
    const key = `${r.sourceEventType}|${r.metric}|${r.windowType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
