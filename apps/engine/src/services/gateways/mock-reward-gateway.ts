import type { IRewardGateway, ExecutionResult, FreeSpinsConfig, FreeBetConfig } from './reward-gateway.interface'

const MOCK_DELAY = 100

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockRewardGatewayService implements IRewardGateway {
  async grantFreeSpins(playerId: string, config: FreeSpinsConfig): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantFreeSpins player=${playerId} count=${config.count}`)
    return { success: true, externalId: `mock-fs-${Date.now()}` }
  }

  async grantFreeBet(playerId: string, config: FreeBetConfig): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantFreeBet player=${playerId} amount=${config.amount}`)
    return { success: true, externalId: `mock-fb-${Date.now()}` }
  }

  async creditPlayer(playerId: string, amount: number, currency: string): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] creditPlayer player=${playerId} amount=${amount} ${currency}`)
    return { success: true, externalId: `mock-credit-${Date.now()}` }
  }

  async grantVirtualCoins(playerId: string, amount: number): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantVirtualCoins player=${playerId} amount=${amount}`)
    return { success: true, externalId: `mock-vc-${Date.now()}` }
  }

  async grantMultiplier(playerId: string, multiplier: number): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantMultiplier player=${playerId} multiplier=${multiplier}`)
    return { success: true, externalId: `mock-mult-${Date.now()}` }
  }

  async grantPhysical(playerId: string, description: string): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantPhysical player=${playerId} desc="${description}"`)
    return { success: true, externalId: `mock-phys-${Date.now()}` }
  }

  async grantAccessUnlock(playerId: string, targetMechanicId: string): Promise<ExecutionResult> {
    await delay(MOCK_DELAY)
    console.log(`[MockRewardGW] grantAccessUnlock player=${playerId} mechanic=${targetMechanicId}`)
    return { success: true, externalId: `mock-unlock-${Date.now()}` }
  }
}
