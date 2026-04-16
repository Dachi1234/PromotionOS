/**
 * Pre-built page layouts ("starters") operators can drop onto the canvas
 * with a single click. Each layout is a Craft.js-serialised tree keyed by
 * the resolver component names.
 *
 * Keep these stable — changing a layout's node shape mid-campaign will
 * orphan already-bound mechanicIds. Add a new starter variant instead.
 *
 * Identifier convention:
 *   ROOT           — the editor's canvas root (fixed)
 *   node_<name>    — deterministic per-layout, lowercase, snake_case
 *
 * The `linkedNodes` / `nodes` arrays use these identifiers so Craft.js
 * can wire parent→child relationships on deserialize.
 */

export interface StarterLayout {
  id: string
  name: string
  description: string
  /** Emoji / short icon hint for the picker. */
  icon: string
  /** Craft.js JSON tree (stringified or object — Craft accepts either). */
  tree: Record<string, unknown>
}

/**
 * "Quick Wheel" — a minimal spin-to-win page:
 *   Hero → Wheel → Reward history.
 *
 * Uses the luxe template for the wheel so it follows the active theme.
 */
const QUICK_WHEEL: Record<string, unknown> = {
  ROOT: {
    type: { resolvedName: 'CanvasRoot' },
    isCanvas: true,
    props: {},
    displayName: 'Canvas',
    custom: {},
    hidden: false,
    nodes: ['node_hero', 'node_wheel', 'node_rewards'],
    linkedNodes: {},
  },
  node_hero: {
    type: { resolvedName: 'HeroBlock' },
    isCanvas: false,
    props: {
      headline: 'Spin to win!',
      subheadline: 'Your prize is one tap away',
      alignment: 'center',
    },
    displayName: 'HeroBlock',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_wheel: {
    type: { resolvedName: 'WheelWidget' },
    isCanvas: false,
    props: {
      mechanicId: '',
      wheelSize: 280,
      spinButtonLabel: 'Spin Now',
      spinButtonColor: '#7c3aed',
      sliceColors: [],
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'WheelWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_rewards: {
    type: { resolvedName: 'RewardHistoryWidget' },
    isCanvas: false,
    props: {
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'RewardHistoryWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
}

/**
 * "Leaderboard Season" — competition-forward layout:
 *   Hero → Countdown → Leaderboard → Progress bar → Opt-In.
 *
 * The countdown sits right under the hero so players feel the urgency
 * before scrolling. Opt-In anchors the bottom so newcomers can join with
 * one tap after seeing the prizes.
 */
const LEADERBOARD_SEASON: Record<string, unknown> = {
  ROOT: {
    type: { resolvedName: 'CanvasRoot' },
    isCanvas: true,
    props: {},
    displayName: 'Canvas',
    custom: {},
    hidden: false,
    nodes: ['node_hero', 'node_countdown', 'node_lb', 'node_progress', 'node_optin'],
    linkedNodes: {},
  },
  node_hero: {
    type: { resolvedName: 'HeroBlock' },
    isCanvas: false,
    props: {
      headline: 'Season Championship',
      subheadline: 'Climb the ranks. Win the prize pool.',
      alignment: 'center',
    },
    displayName: 'HeroBlock',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_countdown: {
    type: { resolvedName: 'CountdownTimerBlock' },
    isCanvas: false,
    props: {
      targetDate: '',
      label: 'Season ends in',
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'CountdownTimerBlock',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_lb: {
    type: { resolvedName: 'LeaderboardWidget' },
    isCanvas: false,
    props: {
      mechanicId: '',
      rowsPerPage: 10,
      headerText: 'Top players',
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'LeaderboardWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_progress: {
    type: { resolvedName: 'ProgressBarWidget' },
    isCanvas: false,
    props: {
      mechanicId: '',
      rewardTeaser: 'Hit the weekly target',
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'ProgressBarWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_optin: {
    type: { resolvedName: 'OptInButtonWidget' },
    isCanvas: false,
    props: {
      preOptInLabel: 'Join the competition',
      postOptInLabel: "You're in — good luck!",
      notEligibleLabel: 'Not eligible for this season',
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'OptInButtonWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
}

/**
 * "Mission Path" — progression-forward layout:
 *   Hero → Mission → Cashout.
 *
 * Good fit for login-streak / step-by-step onboarding campaigns.
 */
const MISSION_PATH: Record<string, unknown> = {
  ROOT: {
    type: { resolvedName: 'CanvasRoot' },
    isCanvas: true,
    props: {},
    displayName: 'Canvas',
    custom: {},
    hidden: false,
    nodes: ['node_hero', 'node_mission', 'node_cashout'],
    linkedNodes: {},
  },
  node_hero: {
    type: { resolvedName: 'HeroBlock' },
    isCanvas: false,
    props: {
      headline: 'Your quest',
      subheadline: 'Complete every step — claim the reward',
      alignment: 'center',
    },
    displayName: 'HeroBlock',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_mission: {
    type: { resolvedName: 'MissionWidget' },
    isCanvas: false,
    props: {
      mechanicId: '',
      claimButtonLabel: 'Claim step',
      showTimeRemaining: true,
      template: 'luxe',
      accentColor: '#7c3aed',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'MissionWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  node_cashout: {
    type: { resolvedName: 'CashoutWidget' },
    isCanvas: false,
    props: {
      mechanicId: '',
      rewardTeaser: 'Grand prize',
      claimLabel: 'Claim Now',
      template: 'luxe',
      accentColor: '#22c55e',
      textColor: '#ffffff',
      bgColor: '#1a1a2e',
    },
    displayName: 'CashoutWidget',
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
}

export const STARTER_LAYOUTS: StarterLayout[] = [
  {
    id: 'quick-wheel',
    name: 'Quick Wheel',
    description: 'Hero + wheel + reward history',
    icon: '🎡',
    tree: QUICK_WHEEL,
  },
  {
    id: 'leaderboard-season',
    name: 'Leaderboard Season',
    description: 'Countdown + ranks + opt-in',
    icon: '🏆',
    tree: LEADERBOARD_SEASON,
  },
  {
    id: 'mission-path',
    name: 'Mission Path',
    description: 'Stepper + cashout grand prize',
    icon: '🗺',
    tree: MISSION_PATH,
  },
]
