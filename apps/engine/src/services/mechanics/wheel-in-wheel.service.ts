import type { Queue } from 'bullmq'
import type { Mechanic, RewardDefinition } from '@promotionos/db'
import type { SpinResult } from '@promotionos/types'
import type { RewardDefinitionRepository } from '../../repositories/reward-definition.repository'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { WheelService } from './wheel.service'

export class WheelInWheelService {
  private readonly wheelCore: WheelService

  constructor(
    private readonly rewardDefRepo: RewardDefinitionRepository,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {
    this.wheelCore = new WheelService(rewardDefRepo, playerRewardRepo, rewardExecutionQueue)
  }

  async spin(playerId: string, mechanic: Mechanic): Promise<SpinResult> {
    const config = mechanic.config as { spin_trigger: string; max_spins_campaign?: number; max_spins_per_day?: number; max_spins_total?: number }

    await this.checkSpinLimitsInternal(playerId, mechanic, config)

    const definitions = await this.rewardDefRepo.findByMechanicId(mechanic.id)
    const activeSlices = definitions.filter(
      (d) => d.probabilityWeight !== null && Number(d.probabilityWeight) > 0,
    )

    if (activeSlices.length === 0) {
      throw new Error('No active slices configured for this wheel-in-wheel')
    }

    const { sliceIndex, definition } = this.wheelCore.resolveWeightedSpin(activeSlices)
    const isConditionGate = this.isConditionGateSlice(definition)

    if (isConditionGate) {
      return this.handleConditionGate(playerId, mechanic, sliceIndex, definition)
    }

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: definition.id,
      status: 'pending',
      grantedAt: new Date(),
      expiresAt: this.calcExpiry(definition),
    })

    await this.rewardExecutionQueue.add('execute-reward', { playerRewardId: playerReward.id })

    return {
      type: 'spin',
      sliceIndex,
      rewardDefinitionId: definition.id,
      rewardType: definition.type,
      playerRewardId: playerReward.id,
    }
  }

  private async handleConditionGate(
    playerId: string,
    mechanic: Mechanic,
    sliceIndex: number,
    definition: RewardDefinition,
  ): Promise<SpinResult> {
    const condConfig = definition.conditionConfig as {
      condition_type: string
      target_value: number
      time_limit_hours: number
      on_failure: string
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + condConfig.time_limit_hours * 3600_000)

    const conditionSnapshot = {
      condition_type: condConfig.condition_type,
      target_value: condConfig.target_value,
      current_value: 0,
      time_limit_hours: condConfig.time_limit_hours,
      assigned_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      on_failure: condConfig.on_failure,
    }

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: definition.id,
      status: 'condition_pending',
      conditionSnapshot,
      grantedAt: now,
      expiresAt,
    })

    return {
      type: 'spin',
      sliceIndex,
      rewardDefinitionId: definition.id,
      rewardType: definition.type,
      playerRewardId: playerReward.id,
      conditionPending: true,
    }
  }

  private isConditionGateSlice(definition: RewardDefinition): boolean {
    return definition.conditionConfig !== null && definition.conditionConfig !== undefined
  }

  private async checkSpinLimitsInternal(
    playerId: string,
    mechanic: Mechanic,
    config: { max_spins_campaign?: number; max_spins_per_day?: number; max_spins_total?: number },
  ): Promise<void> {
    if (config.max_spins_total) {
      const total = await this.playerRewardRepo.countByMechanicAndPlayer(mechanic.id, playerId)
      if (total >= config.max_spins_total) throw new Error('Total spin limit reached')
    }
    if (config.max_spins_per_day) {
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)
      const today = await this.playerRewardRepo.countByMechanicAndPlayerSince(mechanic.id, playerId, startOfDay)
      if (today >= config.max_spins_per_day) throw new Error('Daily spin limit reached')
    }
  }

  private calcExpiry(definition: RewardDefinition): Date | null {
    const config = definition.config as Record<string, unknown>
    const expiryHours = config?.expiry_hours as number | undefined
    if (!expiryHours) return null
    return new Date(Date.now() + expiryHours * 3600_000)
  }
}
