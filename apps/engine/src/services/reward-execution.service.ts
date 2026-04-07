import type { IRewardGateway, ExecutionResult } from './gateways/reward-gateway.interface'
import type { PlayerRewardRepository } from '../repositories/player-reward.repository'
import type { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import type { RewardExecutionRepository } from '../repositories/reward-execution.repository'
import type { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'

export class RewardExecutionService {
  constructor(
    private readonly gateway: IRewardGateway,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly rewardDefRepo: RewardDefinitionRepository,
    private readonly executionRepo: RewardExecutionRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository | null,
  ) {}

  async execute(playerRewardId: string): Promise<void> {
    const playerReward = await this.playerRewardRepo.findById(playerRewardId)
    if (!playerReward) {
      console.error(`[RewardExecution] PlayerReward ${playerRewardId} not found`)
      return
    }

    const rewardDef = await this.rewardDefRepo.findById(playerReward.rewardDefinitionId)
    if (!rewardDef) {
      console.error(`[RewardExecution] RewardDefinition ${playerReward.rewardDefinitionId} not found`)
      return
    }

    const config = rewardDef.config as Record<string, unknown>
    const execution = await this.executionRepo.create({
      playerRewardId,
      externalService: `${rewardDef.type}:${this.gateway.constructor.name}`,
      requestPayload: { playerId: playerReward.playerId, type: rewardDef.type, config },
      status: 'pending',
      attempts: 1,
    })

    let result: ExecutionResult

    try {
      result = await this.routeReward(
        rewardDef.type,
        playerReward.playerId,
        config,
        playerReward.campaignId,
        playerReward.mechanicId,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.executionRepo.updateStatus(execution.id, 'failed', { error: message }, 1)
      throw err
    }

    if (result.success) {
      await this.executionRepo.updateStatus(execution.id, 'success', result, 1)
      await this.playerRewardRepo.updateStatus(playerRewardId, 'fulfilled', {
        fulfilledAt: new Date(),
      })
    } else {
      await this.executionRepo.updateStatus(execution.id, 'failed', result, 1)
    }
  }

  private async routeReward(
    type: string,
    playerId: string,
    config: Record<string, unknown>,
    campaignId: string,
    mechanicId: string,
  ): Promise<ExecutionResult> {
    switch (type) {
      case 'FREE_SPINS':
        return this.gateway.grantFreeSpins(playerId, {
          count: Number(config.count ?? 10),
          gameId: config.gameId as string | undefined,
          betLevel: config.betLevel as number | undefined,
        })

      case 'FREE_BET':
        return this.gateway.grantFreeBet(playerId, {
          amount: Number(config.amount ?? 5),
          currency: String(config.currency ?? 'GEL'),
          sportId: config.sportId as string | undefined,
        })

      case 'CASH':
      case 'CASHBACK':
        return this.gateway.creditPlayer(
          playerId,
          Number(config.amount ?? 0),
          String(config.currency ?? 'GEL'),
        )

      case 'VIRTUAL_COINS':
        if (this.statsRepo) {
          await this.statsRepo.upsertCount({
            playerId,
            campaignId,
            mechanicId,
            metricType: 'virtual_coins',
            windowType: 'campaign',
            windowStart: new Date(0),
          })
        }
        return this.gateway.grantVirtualCoins(playerId, Number(config.amount ?? 0))

      case 'MULTIPLIER':
        return this.gateway.grantMultiplier(playerId, Number(config.multiplier ?? 2))

      case 'PHYSICAL':
        return this.gateway.grantPhysical(playerId, String(config.description ?? 'Physical prize'))

      case 'ACCESS_UNLOCK':
        return this.gateway.grantAccessUnlock(playerId, String(config.target_mechanic_id ?? ''))

      case 'EXTRA_SPIN':
        return { success: true, metadata: { action: 'enqueue_spin', mechanicId: config.target_mechanic_id } }

      default:
        return { success: false, error: `Unknown reward type: ${type}` }
    }
  }
}
