import type { Queue } from 'bullmq'
import type { Mechanic, RewardDefinition } from '@promotionos/db'
import type { SpinResult } from '@promotionos/types'
import type { RewardDefinitionRepository } from '../../repositories/reward-definition.repository'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { AppError } from '../../lib/errors'

export interface WheelConfig {
  spin_trigger: 'manual' | 'automatic'
  max_spins_campaign?: number
  max_spins_per_day?: number
  max_spins_total?: number
}

export class WheelService {
  constructor(
    private readonly rewardDefRepo: RewardDefinitionRepository,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {}

  async spin(playerId: string, mechanic: Mechanic): Promise<SpinResult> {
    const config = mechanic.config as WheelConfig

    await this.checkSpinLimits(playerId, mechanic.id, config)

    const definitions = await this.rewardDefRepo.findByMechanicId(mechanic.id)
    const activeSlices = definitions.filter(
      (d) => d.probabilityWeight !== null && Number(d.probabilityWeight) > 0,
    )

    if (activeSlices.length === 0) {
      throw new AppError('NO_SLICES', 'No active slices configured for this wheel', 400)
    }

    const { sliceIndex, definition } = this.resolveWeightedSpin(activeSlices)

    const expiresAt = this.calculateExpiry(definition)

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: definition.id,
      status: 'pending',
      grantedAt: new Date(),
      expiresAt,
    })

    await this.rewardExecutionQueue.add('execute-reward', {
      playerRewardId: playerReward.id,
    })

    return {
      type: 'spin',
      sliceIndex,
      rewardDefinitionId: definition.id,
      rewardType: definition.type,
      playerRewardId: playerReward.id,
    }
  }

  resolveWeightedSpin(
    slices: RewardDefinition[],
  ): { sliceIndex: number; definition: RewardDefinition } {
    const weights = slices.map((s) => Number(s.probabilityWeight))
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    const random = Math.random() * totalWeight
    let cumulative = 0

    for (let i = 0; i < slices.length; i++) {
      cumulative += weights[i]!
      if (random < cumulative) {
        return { sliceIndex: i, definition: slices[i]! }
      }
    }

    return { sliceIndex: slices.length - 1, definition: slices[slices.length - 1]! }
  }

  private async checkSpinLimits(
    playerId: string,
    mechanicId: string,
    config: WheelConfig,
  ): Promise<void> {
    if (config.max_spins_total) {
      const total = await this.playerRewardRepo.countByMechanicAndPlayer(mechanicId, playerId)
      if (total >= config.max_spins_total) {
        throw new AppError('SPIN_LIMIT_REACHED', 'Total spin limit reached', 400)
      }
    }

    if (config.max_spins_campaign) {
      const campaign = await this.playerRewardRepo.countByMechanicAndPlayer(mechanicId, playerId)
      if (campaign >= config.max_spins_campaign) {
        throw new AppError('SPIN_LIMIT_REACHED', 'Campaign spin limit reached', 400)
      }
    }

    if (config.max_spins_per_day) {
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)
      const today = await this.playerRewardRepo.countByMechanicAndPlayerSince(
        mechanicId,
        playerId,
        startOfDay,
      )
      if (today >= config.max_spins_per_day) {
        throw new AppError('SPIN_LIMIT_REACHED', 'Daily spin limit reached', 400)
      }
    }
  }

  private calculateExpiry(definition: RewardDefinition): Date | null {
    const config = definition.config as Record<string, unknown>
    const expiryHours = config?.expiry_hours as number | undefined
    if (!expiryHours) return null
    return new Date(Date.now() + expiryHours * 3600_000)
  }
}
