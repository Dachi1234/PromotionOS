import type { Mechanic } from '@promotionos/db'
import type { PlayerContext } from '../interfaces/player-context.interface'
import type { WheelService } from './mechanics/wheel.service'
import type { WheelInWheelService } from './mechanics/wheel-in-wheel.service'
import type { LeaderboardService } from './mechanics/leaderboard.service'
import type { LeaderboardLayeredService } from './mechanics/leaderboard-layered.service'
import type { MissionService } from './mechanics/mission.service'
import type { ProgressBarService } from './mechanics/progress-bar.service'
import type { CashoutService } from './mechanics/cashout.service'
import type { MechanicUnlockService } from './mechanics/mechanic-unlock.service'
import type { PlayerRewardRepository } from '../repositories/player-reward.repository'
import type { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'

export class PlayerStateAssemblerService {
  constructor(
    private readonly wheelService: WheelService,
    private readonly wheelInWheelService: WheelInWheelService,
    private readonly leaderboardService: LeaderboardService,
    private readonly leaderboardLayeredService: LeaderboardLayeredService,
    private readonly missionService: MissionService,
    private readonly progressBarService: ProgressBarService,
    private readonly cashoutService: CashoutService,
    private readonly unlockService: MechanicUnlockService,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository,
  ) {}

  async assembleState(
    player: PlayerContext,
    mechanics: Mechanic[],
  ): Promise<Record<string, unknown>> {
    const mechanicStates: Record<string, unknown> = {}

    for (const mechanic of mechanics) {
      try {
        mechanicStates[mechanic.id] = await this.buildMechanicState(
          player,
          mechanic,
        )
      } catch (err) {
        mechanicStates[mechanic.id] = {
          type: mechanic.type,
          error: 'Failed to load state',
        }
      }
    }

    const rewardsSummary = await this.buildRewardsSummary(player.id, mechanics)

    return { mechanicStates, rewardsSummary }
  }

  private async buildMechanicState(
    player: PlayerContext,
    mechanic: Mechanic,
  ): Promise<unknown> {
    const config = mechanic.config as Record<string, unknown>

    switch (mechanic.type) {
      case 'WHEEL': {
        const spinsRemaining = await this.getSpinsRemaining(player.id, mechanic)
        return {
          type: 'WHEEL',
          canSpin: spinsRemaining.canSpin,
          spinsRemaining,
          spinTrigger: config.spin_trigger ?? 'manual',
        }
      }

      case 'WHEEL_IN_WHEEL': {
        const spinsRemaining = await this.getSpinsRemaining(player.id, mechanic)
        const pendingConditions = await this.playerRewardRepo
          .findConditionPendingByPlayerAndCampaign(player.id, mechanic.campaignId)
        return {
          type: 'WHEEL_IN_WHEEL',
          canSpin: spinsRemaining.canSpin,
          spinsRemaining,
          pendingConditions: pendingConditions.map((r) => {
            const snap = r.conditionSnapshot as Record<string, unknown> | null
            return {
              rewardId: r.id,
              conditionType: snap?.condition_type,
              targetValue: snap?.target_value,
              currentValue: snap?.current_value,
              expiresAt: snap?.expires_at,
              percentage: snap?.target_value
                ? Math.min(((Number(snap.current_value) || 0) / Number(snap.target_value)) * 100, 100)
                : 0,
            }
          }),
        }
      }

      case 'LEADERBOARD': {
        const lb = await this.leaderboardService.getPlayerRank(player.id, mechanic)
        return {
          type: 'LEADERBOARD',
          rank: lb.playerRank,
          totalParticipants: lb.total,
          isLocked: false,
        }
      }

      case 'LEADERBOARD_LAYERED': {
        const lb1 = await this.leaderboardLayeredService.getLeaderboard1(player.id, mechanic)
        const lb2Result = await this.leaderboardLayeredService.getLeaderboard2(player.id, mechanic)
        const layeredConfig = config as Record<string, unknown>
        const coinStat = await this.statsRepo.findPlayerStat(
          player.id, mechanic.campaignId, mechanic.id, 'virtual_coins', 'campaign',
        )
        const coins = coinStat ? Number(coinStat.value) : 0
        const threshold = Number(layeredConfig.unlock_threshold_coins ?? 0)
        const isUnlocked = 'type' in lb2Result && lb2Result.type === 'leaderboard'

        return {
          type: 'LEADERBOARD_LAYERED',
          leaderboard1: { rank: lb1.playerRank, totalParticipants: lb1.total, coinsEarned: coins },
          leaderboard2: {
            isUnlocked,
            coinsRequired: threshold,
            coinsProgress: Math.min((coins / Math.max(threshold, 1)) * 100, 100),
            rank: isUnlocked && 'playerRank' in lb2Result ? lb2Result.playerRank : null,
          },
        }
      }

      case 'MISSION': {
        const progress = await this.missionService.getProgress(player.id, mechanic)
        return {
          type: 'MISSION',
          executionMode: progress.executionMode,
          steps: progress.steps,
        }
      }

      case 'PROGRESS_BAR': {
        const pb = await this.progressBarService.getProgress(player.id, mechanic)
        return {
          type: 'PROGRESS_BAR',
          current: pb.current,
          target: pb.target,
          percentage: pb.percentage,
          completed: pb.completed,
          claimed: pb.claimed,
        }
      }

      case 'CASHOUT': {
        const claimCount = await this.playerRewardRepo.countByMechanicAndPlayer(mechanic.id, player.id)
        const maxClaims = Number(config.max_claims_per_player ?? 1)
        const lastReward = await this.playerRewardRepo.findLastByMechanicAndPlayer(mechanic.id, player.id)
        const cooldownHours = config.cooldown_hours as number | undefined
        let cooldownEndsAt: string | null = null
        if (cooldownHours && lastReward) {
          const end = new Date(lastReward.grantedAt.getTime() + cooldownHours * 3600_000)
          if (end > new Date()) cooldownEndsAt = end.toISOString()
        }

        return {
          type: 'CASHOUT',
          canClaim: claimCount < maxClaims && !cooldownEndsAt,
          claimsUsed: claimCount,
          maxClaims,
          cooldownEndsAt,
        }
      }

      default:
        return { type: mechanic.type }
    }
  }

  private async getSpinsRemaining(playerId: string, mechanic: Mechanic) {
    const config = mechanic.config as Record<string, unknown>
    const total = await this.playerRewardRepo.countByMechanicAndPlayer(mechanic.id, playerId)
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const today = await this.playerRewardRepo.countByMechanicAndPlayerSince(mechanic.id, playerId, startOfDay)

    const maxDaily = config.max_spins_per_day as number | undefined
    const maxCampaign = config.max_spins_campaign as number | undefined
    const maxTotal = config.max_spins_total as number | undefined

    const canSpin =
      (!maxDaily || today < maxDaily) &&
      (!maxCampaign || total < maxCampaign) &&
      (!maxTotal || total < maxTotal)

    return {
      canSpin,
      daily: maxDaily ? { used: today, max: maxDaily } : null,
      campaign: maxCampaign ? { used: total, max: maxCampaign } : null,
      total: maxTotal ? { used: total, max: maxTotal } : null,
    }
  }

  private async buildRewardsSummary(playerId: string, mechanics: Mechanic[]) {
    let pending = 0
    let fulfilled = 0

    for (const mechanic of mechanics) {
      const total = await this.playerRewardRepo.countByMechanicAndPlayer(mechanic.id, playerId)
      pending += total
    }

    return { pending, fulfilled, recent: [] }
  }
}
