import type { Queue } from 'bullmq'
import type { Mechanic } from '@promotionos/db'
import type { ProgressResult } from '@promotionos/types'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { playerMechanicState, playerRewards } from '@promotionos/db'
import { eq, and } from 'drizzle-orm'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import type { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import { calculateWindowBounds } from '../window-calculator.service'

type Db = PostgresJsDatabase<typeof schema>

interface ProgressBarConfig {
  metric_type: string
  target_value: number
  reward_definition_id: string
  auto_grant: boolean
  window_type?: string  // 'campaign' | 'daily' | 'weekly' etc.
}

export class ProgressBarService {
  constructor(
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly stateRepo: PlayerMechanicStateRepository,
    private readonly rewardExecutionQueue: Queue,
    private readonly db: Db,
  ) {}

  /**
   * @param referenceTime - Optional simulated clock for time-travel testing.
   *   When provided, the service looks up the stat window that contains this
   *   timestamp instead of "now". This lets QA send events with past/future
   *   dates and immediately see the correct progress for that window.
   */
  async getProgress(playerId: string, mechanic: Mechanic, referenceTime?: Date): Promise<ProgressResult> {
    const config = mechanic.config as ProgressBarConfig
    const windowType = (config.window_type ?? 'campaign') as 'minute' | 'hourly' | 'daily' | 'weekly' | 'campaign' | 'rolling'

    const windowStart = this.resolveWindowStart(windowType, referenceTime)

    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      windowType,
      windowStart,
    )

    const current = stat ? Number(stat.value) : 0
    const percentage = Math.min((current / config.target_value) * 100, 100)
    const completed = current >= config.target_value

    const existingState = await this.stateRepo.findByPlayerAndMechanic(playerId, mechanic.id)
    const claimed = (existingState?.state as Record<string, unknown>)?.claimed === true

    return {
      type: 'progress',
      current,
      target: config.target_value,
      percentage,
      completed,
      claimed,
    }
  }

  async claimProgress(playerId: string, mechanic: Mechanic, referenceTime?: Date): Promise<{ claimed: boolean; playerRewardId?: string }> {
    const config = mechanic.config as ProgressBarConfig
    const windowType = (config.window_type ?? 'campaign') as 'minute' | 'hourly' | 'daily' | 'weekly' | 'campaign' | 'rolling'

    const windowStart = this.resolveWindowStart(windowType, referenceTime)

    // Check threshold outside transaction (read-only, avoids holding lock during stat lookup)
    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      windowType,
      windowStart,
    )
    const current = stat ? Number(stat.value) : 0
    if (current < config.target_value) {
      return { claimed: false }
    }

    // Transaction: atomically check claimed state + mark claimed + create reward
    return this.db.transaction(async (tx) => {
      // Re-check claimed state inside transaction to prevent double-grant
      const [existingState] = await tx
        .select()
        .from(playerMechanicState)
        .where(
          and(
            eq(playerMechanicState.playerId, playerId),
            eq(playerMechanicState.mechanicId, mechanic.id),
          ),
        )
        .limit(1)

      if ((existingState?.state as Record<string, unknown>)?.claimed === true) {
        return { claimed: false }
      }

      // Mark claimed
      await tx
        .insert(playerMechanicState)
        .values({
          playerId,
          mechanicId: mechanic.id,
          state: { claimed: true, completed_at: new Date().toISOString() },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [playerMechanicState.playerId, playerMechanicState.mechanicId],
          set: {
            state: { claimed: true, completed_at: new Date().toISOString() },
            updatedAt: new Date(),
          },
        })

      // Create reward
      const [playerReward] = await tx
        .insert(playerRewards)
        .values({
          playerId,
          campaignId: mechanic.campaignId,
          mechanicId: mechanic.id,
          rewardDefinitionId: config.reward_definition_id,
          status: 'pending',
          grantedAt: new Date(),
        })
        .returning()

      if (!playerReward) throw new Error('Failed to create player reward')

      // Enqueue outside transaction to avoid holding the lock during Redis call
      return { claimed: true, playerRewardId: playerReward.id }
    }).then(async (result) => {
      if (result.claimed && result.playerRewardId) {
        await this.rewardExecutionQueue.add('execute-reward', { playerRewardId: result.playerRewardId })
      }
      return result
    })
  }

  async evaluateAndAutoGrant(playerId: string, mechanic: Mechanic, referenceTime?: Date): Promise<void> {
    const config = mechanic.config as ProgressBarConfig
    if (!config.auto_grant) return
    const windowType = (config.window_type ?? 'campaign') as 'minute' | 'hourly' | 'daily' | 'weekly' | 'campaign' | 'rolling'

    const windowStart = this.resolveWindowStart(windowType, referenceTime)

    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      windowType,
      windowStart,
    )

    const current = stat ? Number(stat.value) : 0
    if (current < config.target_value) return

    // Transaction: atomically check + mark + create reward
    const playerRewardId = await this.db.transaction(async (tx) => {
      const [existingState] = await tx
        .select()
        .from(playerMechanicState)
        .where(
          and(
            eq(playerMechanicState.playerId, playerId),
            eq(playerMechanicState.mechanicId, mechanic.id),
          ),
        )
        .limit(1)

      if ((existingState?.state as Record<string, unknown>)?.claimed === true) return null

      await tx
        .insert(playerMechanicState)
        .values({
          playerId,
          mechanicId: mechanic.id,
          state: { claimed: true, completed_at: new Date().toISOString() },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [playerMechanicState.playerId, playerMechanicState.mechanicId],
          set: {
            state: { claimed: true, completed_at: new Date().toISOString() },
            updatedAt: new Date(),
          },
        })

      const [playerReward] = await tx
        .insert(playerRewards)
        .values({
          playerId,
          campaignId: mechanic.campaignId,
          mechanicId: mechanic.id,
          rewardDefinitionId: config.reward_definition_id,
          status: 'pending',
          grantedAt: new Date(),
        })
        .returning()

      if (!playerReward) throw new Error('Failed to create player reward')
      return playerReward.id
    })

    if (playerRewardId) {
      await this.rewardExecutionQueue.add('execute-reward', { playerRewardId })
    }
  }

  /**
   * For non-campaign window types, compute the windowStart that contains
   * the given referenceTime (or "now" when not provided).
   * For campaign windows, return undefined so findPlayerStat uses the
   * existing behaviour (no windowStart filter — there's only one bucket).
   */
  private resolveWindowStart(windowType: string, referenceTime?: Date): Date | undefined {
    if (windowType === 'campaign') return undefined
    const ref = referenceTime ?? new Date()
    const { windowStart } = calculateWindowBounds(windowType, ref)
    return windowStart
  }
}
