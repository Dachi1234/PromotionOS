import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import type { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import type { MechanicRepository } from '../../repositories/mechanic.repository'

export class MechanicUnlockService {
  constructor(
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly stateRepo: PlayerMechanicStateRepository,
    private readonly mechanicRepo: MechanicRepository,
  ) {}

  async isUnlocked(playerId: string, mechanicId: string): Promise<boolean> {
    const state = await this.stateRepo.findByPlayerAndMechanic(playerId, mechanicId)
    if (!state) return false
    const s = state.state as Record<string, unknown>
    return s.unlocked === true
  }

  async checkAndUnlock(
    playerId: string,
    campaignId: string,
    parentMechanicId: string,
    childMechanicId: string,
    threshold: number,
  ): Promise<boolean> {
    const stat = await this.statsRepo.findPlayerStat(
      playerId,
      campaignId,
      parentMechanicId,
      'virtual_coins',
      'campaign',
    )

    const coins = stat ? Number(stat.value) : 0

    if (coins >= threshold) {
      await this.stateRepo.upsert(playerId, childMechanicId, {
        unlocked: true,
        unlocked_at: new Date().toISOString(),
        coins_at_unlock: coins,
      })
      return true
    }

    return false
  }
}
