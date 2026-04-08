/**
 * All possible metric keys the engine can aggregate.
 * Format: {EVENT_TYPE}_{METRIC}
 *
 * These are shown as fallback options when a mechanic has no
 * aggregation rules configured yet. When aggregation rules exist,
 * the dropdown shows only the configured combinations.
 */

export const EVENT_TYPES = [
  'BET',
  'DEPOSIT',
  'REFERRAL',
  'LOGIN',
  'OPT_IN',
  'FREE_SPIN_USED',
  'MANUAL',
  'MECHANIC_OUTCOME',
] as const

export const METRICS = ['COUNT', 'SUM', 'AVERAGE'] as const

export interface MetricOption {
  value: string
  label: string
}

/** Every valid EVENT_METRIC combination */
export const ALL_METRIC_OPTIONS: MetricOption[] = [
  // Event-based metrics (written by aggregation pipeline from player events)
  ...EVENT_TYPES.flatMap((event) =>
    METRICS.map((metric) => ({
      value: `${event}_${metric}`,
      label: `${event} ${metric}`,
    })),
  ),
  // MECHANIC_OUTCOME metrics (emitted when rewards are granted — e.g. coins from progress bar)
  // Use these on leaderboards to rank by reward outcomes instead of raw events.
  // Requires a MECHANIC_OUTCOME aggregation rule on the leaderboard.
  { value: 'MECHANIC_OUTCOME_COUNT', label: 'MECHANIC_OUTCOME COUNT (reward completions)' },
  { value: 'MECHANIC_OUTCOME_SUM', label: 'MECHANIC_OUTCOME SUM (reward amounts, e.g. coins)' },
]

/**
 * Build metric options for a mechanic.
 * If aggregation rules are configured → use those (more specific).
 * Otherwise → show all possible combinations so the user doesn't have to guess.
 */
export function buildMetricOptions(
  aggregationRules?: { sourceEventType: string; metric: string; windowType: string }[],
): MetricOption[] {
  if (aggregationRules && aggregationRules.length > 0) {
    const fromRules = aggregationRules.map((rule) => ({
      value: `${rule.sourceEventType}_${rule.metric}`,
      label: `${rule.sourceEventType} ${rule.metric} (${rule.windowType})`,
    }))
    // Deduplicate by value
    const seen = new Set<string>()
    return fromRules.filter((opt) => {
      if (seen.has(opt.value)) return false
      seen.add(opt.value)
      return true
    })
  }
  return ALL_METRIC_OPTIONS
}
