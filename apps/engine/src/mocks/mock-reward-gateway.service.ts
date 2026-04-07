import { randomUUID } from 'crypto'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { rewardExecutions } from '@promotionos/db'
import type { IRewardGateway, RewardExecutionResult } from '../interfaces/reward-gateway.interface'

type Db = PostgresJsDatabase<typeof schema>

export class MockRewardGateway implements IRewardGateway {
  constructor(private readonly db: Db) {}

  async executeReward(
    playerRewardId: string,
    rewardType: string,
    config: Record<string, unknown>,
  ): Promise<RewardExecutionResult> {
    console.log('[MockRewardGateway] Executing reward:', {
      playerRewardId,
      rewardType,
      config,
    })

    const externalReference = `MOCK-${randomUUID()}`

    await this.db.insert(rewardExecutions).values({
      playerRewardId,
      externalService: 'mock',
      requestPayload: { rewardType, config },
      responsePayload: { reference: externalReference },
      status: 'success',
      attempts: 1,
      lastAttemptedAt: new Date(),
    })

    return {
      success: true,
      externalReference,
    }
  }
}
