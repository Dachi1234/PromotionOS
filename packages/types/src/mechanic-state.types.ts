import type { z } from 'zod'
import type {
  mechanicActionSchema,
  mechanicActionTypeSchema,
  mechanicResultSchema,
  spinResultSchema,
  leaderboardResultSchema,
  progressResultSchema,
  missionResultSchema,
  claimResultSchema,
  missionStepStatusSchema,
  missionStepStateSchema,
  conditionSnapshotSchema,
} from '@promotionos/zod-schemas'

export type MechanicAction = z.infer<typeof mechanicActionSchema>
export type MechanicActionType = z.infer<typeof mechanicActionTypeSchema>
export type MechanicResult = z.infer<typeof mechanicResultSchema>
export type SpinResult = z.infer<typeof spinResultSchema>
export type LeaderboardResult = z.infer<typeof leaderboardResultSchema>
export type ProgressResult = z.infer<typeof progressResultSchema>
export type MissionResult = z.infer<typeof missionResultSchema>
export type ClaimResult = z.infer<typeof claimResultSchema>
export type MissionStepStatus = z.infer<typeof missionStepStatusSchema>
export type MissionStepState = z.infer<typeof missionStepStateSchema>
export type ConditionSnapshot = z.infer<typeof conditionSnapshotSchema>
