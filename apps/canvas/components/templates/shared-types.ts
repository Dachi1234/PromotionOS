export interface WheelTemplateProps {
  slices: { label: string; color: string }[]
  /** Optional second ring (concentric wheels). Ignored by single-ring templates. */
  innerSlices?: { label: string; color: string }[]
  /** Outer ring rotation angle in degrees. */
  rotation: number
  /** Inner ring rotation angle. Only meaningful for concentric templates
   *  where the inner ring animates independently (sequentially after the
   *  outer settles) to reveal the condition paired with the reward. */
  innerRotation?: number
  spinning: boolean
  result: string | null
  canSpin: boolean
  spinsRemaining: number | null
  onSpin: () => void
  wheelSize: number
  /** Spin button — label / color required (legacy), the rest optional so
   *  templates keep their own styled defaults when the operator hasn't
   *  opted into custom button styling. */
  spinButtonLabel: string
  spinButtonColor: string
  spinButtonTextColor?: string
  spinButtonFontSize?: number    // px at design width; templates may convert to cqw/clamp
  spinButtonRadius?: number      // px (use 999 for pill)
  spinButtonPaddingX?: number    // px
  spinButtonPaddingY?: number    // px
  accentColor?: string
  textColor?: string
  bgColor?: string
  /** Image-backed wheel — PNG is the face instead of generated slices. */
  faceImage?: string
  /** Inner ring image for concentric image wheels. */
  innerFaceImage?: string
  /** Degrees to rotate the image so "slice 0" sits under the top pointer. */
  sliceOffsetDeg?: number
  /** Same, for inner image. */
  innerSliceOffsetDeg?: number
  /** Pointer & hub customisation (image template primarily, but any template
   *  can honour these). Empty / 0 = template default. */
  outerPointerImage?: string
  /** Pointer width in % of the wheel size. Default ~8. */
  outerPointerSize?: number
  innerPointerImage?: string
  innerPointerSize?: number
  /** When true, render the inner pointer at the outer edge of the inner ring. */
  showInnerPointer?: boolean
  /** Centre hub logo (PNG) shown on top of the wheel middle. */
  centerHubImage?: string
  /** Hub diameter in % of the wheel. Default ~18. */
  centerHubSize?: number
  /** Outer spin animation duration (ms). 0 / undefined = template default
   *  (~4800 ms). Operators tune this when the builder-set default feels
   *  too twitchy for their brand. Keep the widget's setTimeout in sync. */
  spinDurationMs?: number
  /** Inner ring spin duration (ms) for compound wheels. 0 = template
   *  default (~2800 ms). */
  innerSpinDurationMs?: number
}

export interface LeaderboardTemplateProps {
  entries: {
    rank: number
    displayName: string
    value: number
    isCurrentPlayer: boolean
    trend: 'up' | 'down' | 'same'
  }[]
  currentPlayerRank?: number
  totalParticipants: number
  lastUpdated: string
  title: string
  timeWindow: string
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface MissionTemplateProps {
  steps: {
    order: number
    title: string
    description: string
    status: 'locked' | 'active' | 'completed' | 'claimed' | 'expired'
    currentValue: number
    targetValue: number
    progressPercentage: number
    expiresAt?: string
  }[]
  executionMode: 'sequential' | 'parallel'
  onClaim: (stepOrder: number) => void
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface ProgressBarTemplateProps {
  currentValue: number
  targetValue: number
  progressPercentage: number
  completed: boolean
  claimed: boolean
  rewardLabel: string
  onClaim: () => void
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface CashoutTemplateProps {
  conditions: {
    label: string
    met: boolean
    currentValue: number
    targetValue: number
  }[]
  allConditionsMet: boolean
  rewardLabel: string
  claimsUsed: number
  maxClaims: number
  cooldownEndsAt?: string
  onClaim: () => void
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface RewardHistoryTemplateProps {
  rewards: {
    id: string
    type: string
    label: string
    amount: number
    status: 'pending' | 'fulfilled' | 'expired' | 'claimable'
    date: string
  }[]
  onClaim: (rewardId: string) => void
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface OptInTemplateProps {
  optedIn: boolean
  eligible: boolean
  onOptIn: () => void
  preLabel: string
  postLabel: string
  accentColor?: string
  textColor?: string
  bgColor?: string
}

export interface CountdownTemplateProps {
  targetDate: string
  label: string
  accentColor?: string
  textColor?: string
  bgColor?: string
}

/**
 * Template styles — after the "serious only" cull, the wheel is the only
 * widget with multiple template families. Every other widget renders a
 * single serious default inline.
 *
 *   - `jackpot`    — Vegas slot-floor. Gold & crimson, bulb rim, huge centre.
 *   - `stadium`    — Navy + emerald multi-ring with gold rim. Sportsbook tone.
 *   - `casino_vip` — Emerald baize + polished brass rim, VIP monogram hub.
 *
 * Older cartoonish styles (`classic`/`modern`/`neon`/`luxe`/`story`/
 * `tournament`) were deleted. Any residual `template` strings in saved
 * canvases fall through to the wheel default.
 */
export type TemplateStyle = 'jackpot' | 'stadium' | 'casino_vip' | 'concentric' | 'image'
