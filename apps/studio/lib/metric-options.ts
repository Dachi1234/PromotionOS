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

/** Every valid EVENT_METRIC combination.
 *
 * `MECHANIC_OUTCOME` is already in EVENT_TYPES above so the cartesian product
 * below produces MECHANIC_OUTCOME_{COUNT,SUM,AVERAGE}. Do not re-add those
 * entries here — it creates React duplicate-key warnings and repeated rows
 * in the dropdown.
 */
export const ALL_METRIC_OPTIONS: MetricOption[] = EVENT_TYPES.flatMap((event) =>
  METRICS.map((metric) => {
    const value = `${event}_${metric}`
    // Give MECHANIC_OUTCOME options a more descriptive label since this event
    // is synthetic (emitted by reward-executor when a reward is granted).
    if (event === 'MECHANIC_OUTCOME') {
      if (metric === 'COUNT') {
        return { value, label: 'MECHANIC_OUTCOME COUNT (reward completions)' }
      }
      if (metric === 'SUM') {
        return { value, label: 'MECHANIC_OUTCOME SUM (reward amounts, e.g. coins)' }
      }
    }
    return { value, label: `${event} ${metric}` }
  }),
)

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
