export interface ExecutionResult {
  success: boolean
  externalId?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface FreeSpinsConfig {
  count: number
  gameId?: string
  betLevel?: number
}

export interface FreeBetConfig {
  amount: number
  currency: string
  sportId?: string
}

export interface IRewardGateway {
  grantFreeSpins(playerId: string, config: FreeSpinsConfig): Promise<ExecutionResult>
  grantFreeBet(playerId: string, config: FreeBetConfig): Promise<ExecutionResult>
  creditPlayer(playerId: string, amount: number, currency: string): Promise<ExecutionResult>
  grantVirtualCoins(playerId: string, amount: number): Promise<ExecutionResult>
  grantMultiplier(playerId: string, multiplier: number): Promise<ExecutionResult>
  grantPhysical(playerId: string, description: string): Promise<ExecutionResult>
  grantAccessUnlock(playerId: string, targetMechanicId: string): Promise<ExecutionResult>
}
