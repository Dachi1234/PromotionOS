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

  /**
   * Check if all dependencies for a mechanic are satisfied.
   * Returns true if there are no dependencies or all are met.
   */
  async areDependenciesMet(playerId: string, mechanicId: string): Promise<boolean> {
    const deps = await this.mechanicRepo.findDependenciesForMechanic(mechanicId)
    if (deps.length === 0) return true

    for (const dep of deps) {
      const condition = dep.unlockCondition as Record<string, unknown>

      if (condition.type === 'mechanic_complete') {
        // Check if the parent mechanic has been completed (claimed)
        const parentState = await this.stateRepo.findByPlayerAndMechanic(playerId, dep.dependsOnMechanicId)
        if (!parentState) return false
        const s = parentState.state as Record<string, unknown>
        if (s.claimed !== true && s.completed !== true) return false
      } else if (condition.type === 'virtual_coins') {
        // Check virtual coins threshold (used by layered leaderboard)
        const threshold = Number(condition.threshold ?? 0)
        const parentMechanic = await this.mechanicRepo.findById(dep.dependsOnMechanicId)
        if (!parentMechanic) return false
        const stat = await this.statsRepo.findPlayerStat(
          playerId,
          parentMechanic.campaignId,
          dep.dependsOnMechanicId,
          'virtual_coins',
          'campaign',
        )
        const coins = stat ? Number(stat.value) : 0
        if (coins < threshold) return false
      } else {
        // Unknown condition type — treat as not met for safety
        return false
      }
    }

    return true
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
