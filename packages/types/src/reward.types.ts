import type { z } from 'zod'
import type {
  rewardTypeSchema,
  playerRewardStatusSchema,
  rewardExecutionStatusSchema,
  createRewardDefinitionSchema,
  rewardDefinitionResponseSchema,
  playerRewardResponseSchema,
  rewardTransformationConfigSchema,
} from '@promotionos/zod-schemas'

export type RewardType = z.infer<typeof rewardTypeSchema>
export type PlayerRewardStatus = z.infer<typeof playerRewardStatusSchema>
export type RewardExecutionStatus = z.infer<typeof rewardExecutionStatusSchema>
export type CreateRewardDefinitionInput = z.infer<typeof createRewardDefinitionSchema>
export type RewardDefinitionResponse = z.infer<typeof rewardDefinitionResponseSchema>
export type PlayerRewardResponse = z.infer<typeof playerRewardResponseSchema>
export type RewardTransformationConfig = z.infer<typeof rewardTransformationConfigSchema>
