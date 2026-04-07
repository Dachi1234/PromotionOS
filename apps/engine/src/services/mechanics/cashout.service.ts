import type { Queue } from 'bullmq'
import type { Mechanic } from '@promotionos/db'
import type { ClaimResult } from '@promotionos/types'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import { evaluateConditionTree } from '../condition-evaluator.service'
import type { PlayerEvaluationContext, StatsContext } from '../condition-evaluator.service'
import type { ConditionNode } from '@promotionos/types'
import { AppError } from '../../lib/errors'

interface CashoutConfig {
  claim_conditions: ConditionNode
  reward_definition_id: string
  max_claims_per_player: number
  cooldown_hours?: number
}

export class CashoutService {
  constructor(
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {}

  async claim(playerId: string, mechanic: Mechanic): Promise<ClaimResult> {
    const config = mechanic.config as CashoutConfig

    const claimCount = await this.playerRewardRepo.countByMechanicAndPlayer(
      mechanic.id,
      playerId,
    )
    if (claimCount >= config.max_claims_per_player) {
      throw new AppError('MAX_CLAIMS_REACHED', 'Maximum claims reached for this mechanic', 400)
    }

    if (config.cooldown_hours) {
      const lastReward = await this.playerRewardRepo.findLastByMechanicAndPlayer(
        mechanic.id,
        playerId,
      )
      if (lastReward) {
        const cooldownEnd = new Date(
          lastReward.grantedAt.getTime() + config.cooldown_hours * 3600_000,
        )
        if (new Date() < cooldownEnd) {
          throw new AppError('COOLDOWN_ACTIVE', 'Claim cooldown period is active', 400)
        }
      }
    }

    const statsContext = await this.buildStatsContext(playerId, mechanic)
    const dummyPlayer: PlayerEvaluationContext = {
      id: playerId,
      externalId: playerId,
      displayName: 'Player',
      segmentTags: [],
      vipTier: 'bronze',
      totalDepositsGel: 0,
      registrationDate: new Date(),
    }

    const result = evaluateConditionTree(config.claim_conditions, dummyPlayer, statsContext)
    if (!result.eligible) {
      throw new AppError('CONDITIONS_NOT_MET', `Conditions not met: ${result.failedConditions?.join(', ')}`, 400)
    }

    const playerReward = await this.playerRewardRepo.create({
      playerId,
      campaignId: mechanic.campaignId,
      mechanicId: mechanic.id,
      rewardDefinitionId: config.reward_definition_id,
      status: 'pending',
      grantedAt: new Date(),
    })

    await this.rewardExecutionQueue.add('execute-reward', {
      playerRewardId: playerReward.id,
    })

    return {
      type: 'claim',
      playerRewardId: playerReward.id,
      rewardType: 'pending',
      status: 'pending',
    }
  }

  private async buildStatsContext(
    playerId: string,
    mechanic: Mechanic,
  ): Promise<StatsContext> {
    const metricTypes = ['bet_amount', 'deposit_amount', 'deposit_count', 'bet_count']
    const context: StatsContext = {}

    for (const metricType of metricTypes) {
      const stat = await this.statsRepo.findPlayerStat(
        playerId,
        mechanic.campaignId,
        mechanic.id,
        metricType,
        'campaign',
      )
      if (stat) {
        context[metricType] = Number(stat.value)
      }
    }

    return context
  }
}
