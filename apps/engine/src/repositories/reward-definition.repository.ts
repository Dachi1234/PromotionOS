import { eq, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { rewardDefinitions } from '@promotionos/db'
import type { RewardDefinition } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class RewardDefinitionRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<RewardDefinition | null> {
    const rows = await this.db
      .select()
      .from(rewardDefinitions)
      .where(eq(rewardDefinitions.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByMechanicId(mechanicId: string): Promise<RewardDefinition[]> {
    return this.db
      .select()
      .from(rewardDefinitions)
      .where(eq(rewardDefinitions.mechanicId, mechanicId))
  }
}
