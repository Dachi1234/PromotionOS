import type { Queue } from 'bullmq'
import type { Mechanic } from '@promotionos/db'
import type { ProgressResult } from '@promotionos/types'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import type { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'

interface ProgressBarConfig {
  metric_type: string
  target_value: number
  reward_definition_id: string
  auto_grant: boolean
}

export class ProgressBarService {
  constructor(
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly stateRepo: PlayerMechanicStateRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {}

  async getProgress(playerId: string, mechanic: Mechanic): Promise<ProgressResult> {
    const config = mechanic.config as ProgressBarConfig

    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      'campaign',
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

  async claimProgress(playerId: string, mechanic: Mechanic): Promise<{ claimed: boolean; playerRewardId?: string }> {
    const config = mechanic.config as ProgressBarConfig
    const existingState = await this.stateRepo.findByPlayerAndMechanic(playerId, mechanic.id)
    if ((existingState?.state as Record<string, unknown>)?.claimed === true) {
      return { claimed: false }
    }

    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      'campaign',
    )
    const current = stat ? Number(stat.value) : 0
    if (current < config.target_value) {
      return { claimed: false }
    }

    await this.stateRepo.upsert(playerId, mechanic.id, { claimed: true, completed_at: new Date().toISOString() })

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: config.reward_definition_id,
      status: 'pending',
      grantedAt: new Date(),
    })

    await this.rewardExecutionQueue.add('execute-reward', { playerRewardId: playerReward.id })
    return { claimed: true, playerRewardId: playerReward.id }
  }

  async evaluateAndAutoGrant(playerId: string, mechanic: Mechanic): Promise<void> {
    const config = mechanic.config as ProgressBarConfig
    if (!config.auto_grant) return

    const existingState = await this.stateRepo.findByPlayerAndMechanic(playerId, mechanic.id)
    if ((existingState?.state as Record<string, unknown>)?.claimed === true) return

    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      config.metric_type,
      'campaign',
    )

    const current = stat ? Number(stat.value) : 0
    if (current < config.target_value) return

    await this.stateRepo.upsert(playerId, mechanic.id, { claimed: true, completed_at: new Date().toISOString() })

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: config.reward_definition_id,
      status: 'pending',
      grantedAt: new Date(),
    })

    await this.rewardExecutionQueue.add('execute-reward', { playerRewardId: playerReward.id })
  }
}
