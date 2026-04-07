import { eq, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { mechanics, mechanicDependencies } from '@promotionos/db'
import type { Mechanic } from '@promotionos/db'

type Db = PostgresJsDatabase<typeof schema>

export class MechanicRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Mechanic | null> {
    const rows = await this.db
      .select()
      .from(mechanics)
      .where(eq(mechanics.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByCampaignId(campaignId: string): Promise<Mechanic[]> {
    return this.db
      .select()
      .from(mechanics)
      .where(eq(mechanics.campaignId, campaignId))
  }

  async findActiveByCampaignAndType(
    campaignId: string,
    type: Mechanic['type'],
  ): Promise<Mechanic[]> {
    return this.db
      .select()
      .from(mechanics)
      .where(
        and(
          eq(mechanics.campaignId, campaignId),
          eq(mechanics.type, type),
          eq(mechanics.isActive, true),
        ),
      )
  }

  async findDependency(mechanicId: string, dependsOnId: string) {
    const rows = await this.db
      .select()
      .from(mechanicDependencies)
      .where(
        and(
          eq(mechanicDependencies.mechanicId, mechanicId),
          eq(mechanicDependencies.dependsOnMechanicId, dependsOnId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }
}
