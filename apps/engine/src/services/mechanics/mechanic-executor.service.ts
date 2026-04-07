import type { Mechanic } from '@promotionos/db'
import type { MechanicResult, MechanicAction } from '@promotionos/types'
import type { MechanicRepository } from '../../repositories/mechanic.repository'
import type { WheelService } from './wheel.service'
import type { WheelInWheelService } from './wheel-in-wheel.service'
import type { LeaderboardService } from './leaderboard.service'
import type { LeaderboardLayeredService } from './leaderboard-layered.service'
import type { MissionService } from './mission.service'
import type { ProgressBarService } from './progress-bar.service'
import type { CashoutService } from './cashout.service'
import { AppError } from '../../lib/errors'

export class MechanicExecutorService {
  constructor(
    private readonly mechanicRepo: MechanicRepository,
    private readonly wheelService: WheelService,
    private readonly wheelInWheelService: WheelInWheelService,
    private readonly leaderboardService: LeaderboardService,
    private readonly leaderboardLayeredService: LeaderboardLayeredService,
    private readonly missionService: MissionService,
    private readonly progressBarService: ProgressBarService,
    private readonly cashoutService: CashoutService,
  ) {}

  async execute(
    mechanicId: string,
    playerId: string,
    action: MechanicAction,
  ): Promise<MechanicResult> {
    const mechanic = await this.mechanicRepo.findById(mechanicId)
    if (!mechanic) {
      throw new AppError('MECHANIC_NOT_FOUND', `Mechanic ${mechanicId} not found`, 404)
    }

    return this.routeToService(mechanic, playerId, action)
  }

  private async routeToService(
    mechanic: Mechanic,
    playerId: string,
    action: MechanicAction,
  ): Promise<MechanicResult> {
    switch (mechanic.type) {
      case 'WHEEL':
        return this.wheelService.spin(playerId, mechanic)

      case 'WHEEL_IN_WHEEL':
        return this.wheelInWheelService.spin(playerId, mechanic)

      case 'LEADERBOARD':
        return this.leaderboardService.getPlayerRank(
          playerId,
          mechanic,
          action.page,
          action.pageSize,
        )

      case 'LEADERBOARD_LAYERED':
        return this.leaderboardLayeredService.getLeaderboard1(
          playerId,
          mechanic,
          action.page,
          action.pageSize,
        ) as Promise<MechanicResult>

      case 'MISSION':
        return this.missionService.handleAction(playerId, mechanic, action)

      case 'PROGRESS_BAR':
        return this.progressBarService.getProgress(playerId, mechanic)

      case 'CASHOUT':
        return this.cashoutService.claim(playerId, mechanic)

      default:
        throw new AppError(
          'UNKNOWN_MECHANIC_TYPE',
          `Unknown mechanic type: ${mechanic.type}`,
          400,
        )
    }
  }
}
