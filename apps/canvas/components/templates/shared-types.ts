export interface WheelTemplateProps {
  slices: { label: string; color: string }[]
  rotation: number
  spinning: boolean
  result: string | null
  canSpin: boolean
  spinsRemaining: number | null
  onSpin: () => void
  wheelSize: number
  spinButtonLabel: string
  spinButtonColor: string
  accentColor?: string
  textColor?: string
  bgColor?: string
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

export type TemplateStyle = 'classic' | 'modern' | 'neon'
