import type { Queue } from 'bullmq'
import type { Mechanic } from '@promotionos/db'
import type { LeaderboardResult } from '@promotionos/types'
import type { LeaderboardService, LeaderboardConfig } from './leaderboard.service'
import type { MechanicUnlockService } from './mechanic-unlock.service'
import type { MechanicRepository } from '../../repositories/mechanic.repository'

export interface LeaderboardLayeredConfig {
  leaderboard_1: LeaderboardConfig
  leaderboard_2: LeaderboardConfig
  unlock_threshold_coins: number
  coin_award_mode: 'end_of_period' | 'continuous'
  coins_per_hour_by_rank?: { from_rank: number; to_rank: number; coins: number }[]
}

export class LeaderboardLayeredService {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly unlockService: MechanicUnlockService,
    private readonly mechanicRepo: MechanicRepository,
  ) {}

  async getLeaderboard1(
    playerId: string,
    mechanic: Mechanic,
    page = 1,
    pageSize = 20,
  ): Promise<LeaderboardResult> {
    const config = mechanic.config as LeaderboardLayeredConfig
    return this.leaderboardService.getPlayerRank(
      playerId,
      { ...mechanic, config: config.leaderboard_1 },
      page,
      pageSize,
    )
  }

  async getLeaderboard2(
    playerId: string,
    mechanic: Mechanic,
    page = 1,
    pageSize = 20,
  ): Promise<LeaderboardResult | { type: 'locked'; message: string }> {
    const config = mechanic.config as LeaderboardLayeredConfig

    const unlocked = await this.unlockService.isUnlocked(playerId, mechanic.id)
    if (!unlocked) {
      return {
        type: 'locked',
        message: `Requires ${config.unlock_threshold_coins} virtual coins to unlock`,
      }
    }

    return this.leaderboardService.getPlayerRank(
      playerId,
      { ...mechanic, config: config.leaderboard_2 },
      page,
      pageSize,
    )
  }

  async checkUnlockAfterCoinAward(
    playerId: string,
    mechanic: Mechanic,
  ): Promise<boolean> {
    const config = mechanic.config as LeaderboardLayeredConfig
    return this.unlockService.checkAndUnlock(
      playerId,
      mechanic.campaignId,
      mechanic.id,
      mechanic.id,
      config.unlock_threshold_coins,
    )
  }
}
