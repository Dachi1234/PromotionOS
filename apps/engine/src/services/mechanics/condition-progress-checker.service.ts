import type { Queue } from 'bullmq'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'

const CONDITION_TO_METRIC: Record<string, string> = {
  DEPOSIT_AMOUNT: 'deposit_amount',
  BET_AMOUNT: 'bet_amount',
  REFERRAL_COUNT: 'referral_count',
  MISSION_COMPLETE: 'mission_complete',
}

export class ConditionProgressCheckerService {
  constructor(
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly rewardExecutionQueue: Queue,
  ) {}

  async checkForPlayer(playerId: string, campaignId: string): Promise<void> {
    const pendingRewards =
      await this.playerRewardRepo.findConditionPendingByPlayerAndCampaign(playerId, campaignId)

    for (const reward of pendingRewards) {
      await this.evaluateCondition(reward.id, reward.conditionSnapshot as ConditionSnapshotData)
    }
  }

  async handleExpiry(rewardId: string, snapshot: ConditionSnapshotData): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(snapshot.expires_at)

    if (now < expiresAt) return

    if (snapshot.on_failure === 'expire') {
      await this.playerRewardRepo.updateStatus(rewardId, 'expired')
    } else {
      const newExpiresAt = new Date(now.getTime() + snapshot.time_limit_hours * 3600_000)
      const newSnapshot: ConditionSnapshotData = {
        ...snapshot,
        current_value: 0,
        assigned_at: now.toISOString(),
        expires_at: newExpiresAt.toISOString(),
      }
      await this.playerRewardRepo.updateConditionSnapshot(rewardId, newSnapshot)
    }
  }

  private async evaluateCondition(
    rewardId: string,
    snapshot: ConditionSnapshotData,
  ): Promise<void> {
    if (!snapshot) return

    const now = new Date()
    const expiresAt = new Date(snapshot.expires_at)

    if (now > expiresAt) {
      await this.handleExpiry(rewardId, snapshot)
      return
    }

    const metricType = CONDITION_TO_METRIC[snapshot.condition_type] ?? snapshot.condition_type.toLowerCase()

    const reward = await this.playerRewardRepo.findById(rewardId)
    if (!reward) return

    const stat = await this.statsRepo.findStat(
      reward.playerId,
      reward.campaignId,
      reward.mechanicId,
      metricType,
      'campaign',
      new Date(0),
    )

    const currentValue = stat?.value ? Number(stat.value) : 0

    const updatedSnapshot = { ...snapshot, current_value: currentValue }
    await this.playerRewardRepo.updateConditionSnapshot(rewardId, updatedSnapshot)

    if (currentValue >= snapshot.target_value) {
      await this.playerRewardRepo.updateStatus(rewardId, 'pending')
      await this.rewardExecutionQueue.add('execute-reward', { playerRewardId: rewardId })
    }
  }
}

interface ConditionSnapshotData {
  condition_type: string
  target_value: number
  current_value: number
  time_limit_hours: number
  assigned_at: string
  expires_at: string
  on_failure: 'expire' | 'carry_over'
}
