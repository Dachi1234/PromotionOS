import type { z } from 'zod'
import type {
  mechanicTypeSchema,
  mechanicRoleSchema,
  createMechanicSchema,
  updateMechanicSchema,
  mechanicResponseSchema,
  wheelConfigSchema,
  leaderboardConfigSchema,
  missionConfigSchema,
  progressBarConfigSchema,
  unlockConditionSchema,
} from '@promotionos/zod-schemas'

export type MechanicType = z.infer<typeof mechanicTypeSchema>
export type MechanicRole = z.infer<typeof mechanicRoleSchema>
export type CreateMechanicInput = z.infer<typeof createMechanicSchema>
export type UpdateMechanicInput = z.infer<typeof updateMechanicSchema>
export type MechanicResponse = z.infer<typeof mechanicResponseSchema>
export type WheelConfig = z.infer<typeof wheelConfigSchema>
export type LeaderboardConfig = z.infer<typeof leaderboardConfigSchema>
export type MissionConfig = z.infer<typeof missionConfigSchema>
export type ProgressBarConfig = z.infer<typeof progressBarConfigSchema>
export type UnlockCondition = z.infer<typeof unlockConditionSchema>
