export interface RewardExecutionResult {
  success: boolean
  externalReference?: string
  errorMessage?: string
}

export interface IRewardGateway {
  executeReward(
    playerRewardId: string,
    rewardType: string,
    config: Record<string, unknown>,
  ): Promise<RewardExecutionResult>
}
