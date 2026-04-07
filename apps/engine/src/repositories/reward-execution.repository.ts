import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { rewardExecutions } from '@promotionos/db'
import type { RewardExecution, NewRewardExecution } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class RewardExecutionRepository {
  constructor(private readonly db: Db) {}

  async create(data: NewRewardExecution): Promise<RewardExecution> {
    const rows = await this.db.insert(rewardExecutions).values(data).returning()
    const row = rows[0]
    if (!row) throw new Error('Failed to create reward execution')
    return row
  }

  async updateStatus(
    id: string,
    status: RewardExecution['status'],
    responsePayload?: unknown,
    attempts?: number,
  ): Promise<void> {
    await this.db
      .update(rewardExecutions)
      .set({
        status,
        responsePayload: responsePayload ?? undefined,
        attempts,
        lastAttemptedAt: new Date(),
      })
      .where(eq(rewardExecutions.id, id))
  }
}
