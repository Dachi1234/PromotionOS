/**
 * Mechanic capability registry.
 *
 * Source of truth for "what config options does the *engine* actually
 * consume" — used by widgets and Studio wizard panels to gate unsupported
 * features so the UI never renders a control that does nothing.
 *
 * The rule: if an option isn't listed here, the Studio wizard and canvas
 * widgets must either hide it or render it with `experimental: true`
 * styling (disabled / "Preview only" badge).
 *
 * When the engine gains support for a new option:
 *   1. Add it to the `supported` array for its mechanic type.
 *   2. Remove it from `experimental` if it's graduating.
 *   3. The UI updates on the next build — no per-widget edits required.
 *
 * Keep this file in sync with:
 *   - engine `packages/zod-schemas/src/mechanic/*` (the authoritative schema)
 *   - engine services under `apps/engine/src/services/mechanics/`
 */

export type MechanicType =
  | 'WHEEL'
  | 'WHEEL_IN_WHEEL'
  | 'PROGRESS_BAR'
  | 'MISSION'
  | 'LEADERBOARD'
  | 'LEADERBOARD_LAYERED'
  | 'CASHOUT'

export interface MechanicCapability {
  /** Options the engine reads today. Safe to render unconditionally. */
  supported: readonly string[]
  /** Options the UI shouldn't expose yet (backend unaware). The widget /
   *  wizard may show these with `disabled` + a "Preview only" badge if
   *  they're valuable to preview visually. */
  experimental: readonly string[]
  /** Short human blurb used by tooltips / empty states. */
  summary: string
}

export const MECHANIC_CAPABILITIES: Record<MechanicType, MechanicCapability> = {
  WHEEL: {
    supported: [
      'spin_trigger',
      'max_spins_per_day',
      'max_spins_campaign',
      'max_spins_total',
      'visual_config.spin_duration_ms',
    ],
    experimental: [
      'visual_config.sound_enabled', // sound plumbing not wired yet
      'visual_config.haptics',       // mobile vibration API not used yet
      'near_miss_bias',              // anti-gambling regulator feature, pending
    ],
    summary: 'A prize wheel. Player spins to win a weighted-random reward.',
  },
  WHEEL_IN_WHEEL: {
    supported: [
      'spin_trigger',
      'max_spins_per_day',
      'max_spins_campaign',
      'unlock_condition',
      'visual_config.spin_duration_ms',
    ],
    experimental: ['visual_config.tier_preview'],
    summary: 'A wheel gated behind a condition — e.g. unlock after 3 logins.',
  },
  PROGRESS_BAR: {
    supported: [
      'metricType',
      'targetValue',
      'autoGrant',
      'reward_definition_id',
    ],
    experimental: [
      'tiered_thresholds',      // multi-stage bars not in engine yet
      'visual_config.milestones',
    ],
    summary: 'Fills as the player accumulates a metric. Grants reward at target.',
  },
  MISSION: {
    supported: [
      'steps',
      'mode',                   // sequential | parallel
    ],
    experimental: [
      'time_limit_per_step',
      'visual_config.path_style',
    ],
    summary: 'A series of goals — complete each step to earn its reward.',
  },
  LEADERBOARD: {
    supported: [
      'ranking_metric',
      'window_type',
      'tie_breaking',
      'max_displayed_ranks',
      'prize_distribution',
    ],
    experimental: [
      'secondary_metric',       // read but not yet used for tiebreaks
      'visual_config.show_delta',
    ],
    summary: 'Ranks players by a metric. Prizes awarded on window close.',
  },
  LEADERBOARD_LAYERED: {
    supported: [
      'primary',
      'secondary',
      'window_type',
    ],
    experimental: ['visual_config.swap_animation'],
    summary: 'Two stacked leaderboards sharing a campaign window.',
  },
  CASHOUT: {
    supported: [
      'claim_conditions',
      'reward_definition_id',
    ],
    experimental: [
      'partial_claim',          // engine grants all-or-nothing today
      'visual_config.vault_style',
    ],
    summary: 'Player claims an accumulated reward when conditions are met.',
  },
}

/** Is this option path actually consumed by the engine for this mechanic? */
export function isSupported(type: MechanicType, optionPath: string): boolean {
  return MECHANIC_CAPABILITIES[type].supported.includes(optionPath)
}

/** Is this option visible in the UI but disabled / preview-only? */
export function isExperimental(type: MechanicType, optionPath: string): boolean {
  return MECHANIC_CAPABILITIES[type].experimental.includes(optionPath)
}

/**
 * Returns `'supported' | 'experimental' | 'unsupported'` for a given path.
 * Widgets should switch on this and render accordingly (normal control /
 * disabled control with badge / hidden).
 */
export function optionStatus(
  type: MechanicType,
  optionPath: string,
): 'supported' | 'experimental' | 'unsupported' {
  const caps = MECHANIC_CAPABILITIES[type]
  if (caps.supported.includes(optionPath)) return 'supported'
  if (caps.experimental.includes(optionPath)) return 'experimental'
  return 'unsupported'
}
