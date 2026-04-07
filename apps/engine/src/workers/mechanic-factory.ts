import { Queue } from 'bullmq'
import type { Redis } from 'ioredis'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { PlayerMechanicStateRepository } from '../repositories/player-mechanic-state.repository'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { WheelService } from '../services/mechanics/wheel.service'
import { WheelInWheelService } from '../services/mechanics/wheel-in-wheel.service'
import { LeaderboardService } from '../services/mechanics/leaderboard.service'
import { LeaderboardCacheService } from '../services/mechanics/leaderboard-cache.service'
import { LeaderboardLayeredService } from '../services/mechanics/leaderboard-layered.service'
import { MissionService } from '../services/mechanics/mission.service'
import { ProgressBarService } from '../services/mechanics/progress-bar.service'
import { CashoutService } from '../services/mechanics/cashout.service'
import { MechanicUnlockService } from '../services/mechanics/mechanic-unlock.service'
import { ConditionProgressCheckerService } from '../services/mechanics/condition-progress-checker.service'
import { QUEUE_NAMES } from '../lib/queue'

type Db = PostgresJsDatabase<typeof schema>

export interface MechanicServicesBundle {
  wheelService: WheelService
  wheelInWheelService: WheelInWheelService
  leaderboardService: LeaderboardService
  leaderboardLayeredService: LeaderboardLayeredService
  missionService: MissionService
  progressBarService: ProgressBarService
  cashoutService: CashoutService
  conditionCheckerService: ConditionProgressCheckerService
  cleanup: () => void
}

export function createMechanicServices(
  connection: Redis,
  db: Db,
  redisClient: Redis | null,
): MechanicServicesBundle {
  const rewardDefRepo = new RewardDefinitionRepository(db)
  const playerRewardRepo = new PlayerRewardRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const stateRepo = new PlayerMechanicStateRepository(db)
  const mechanicRepo = new MechanicRepository(db)
  const rewardExecQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection })

  const cacheService = new LeaderboardCacheService(redisClient)

  const wheelService = new WheelService(rewardDefRepo, playerRewardRepo, rewardExecQueue)
  const wheelInWheelService = new WheelInWheelService(rewardDefRepo, playerRewardRepo, rewardExecQueue)

  const leaderboardService = new LeaderboardService(
    statsRepo,
    cacheService,
    playerRewardRepo,
    rewardDefRepo,
    rewardExecQueue,
  )

  const unlockService = new MechanicUnlockService(statsRepo, stateRepo, mechanicRepo)

  const leaderboardLayeredService = new LeaderboardLayeredService(
    leaderboardService,
    unlockService,
    mechanicRepo,
  )

  const missionService = new MissionService(stateRepo, statsRepo, playerRewardRepo, rewardExecQueue)
  const progressBarService = new ProgressBarService(statsRepo, playerRewardRepo, stateRepo, rewardExecQueue)
  const cashoutService = new CashoutService(playerRewardRepo, statsRepo, rewardExecQueue)
  const conditionCheckerService = new ConditionProgressCheckerService(playerRewardRepo, statsRepo, rewardExecQueue)

  return {
    wheelService,
    wheelInWheelService,
    leaderboardService,
    leaderboardLayeredService,
    missionService,
    progressBarService,
    cashoutService,
    conditionCheckerService,
    cleanup: () => {
      rewardExecQueue.close().catch(() => {})
    },
  }
}
