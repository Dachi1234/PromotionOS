import { Queue } from 'bullmq'
import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { mechanics, campaigns, playerCampaignOptins } from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import { RewardDefinitionRepository } from '../../repositories/reward-definition.repository'
import { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import { MechanicRepository } from '../../repositories/mechanic.repository'
import { WheelService } from '../../services/mechanics/wheel.service'
import { WheelInWheelService } from '../../services/mechanics/wheel-in-wheel.service'
import { LeaderboardService } from '../../services/mechanics/leaderboard.service'
import { LeaderboardLayeredService } from '../../services/mechanics/leaderboard-layered.service'
import { LeaderboardCacheService } from '../../services/mechanics/leaderboard-cache.service'
import { MissionService } from '../../services/mechanics/mission.service'
import { ProgressBarService } from '../../services/mechanics/progress-bar.service'
import { CashoutService } from '../../services/mechanics/cashout.service'
import { MechanicUnlockService } from '../../services/mechanics/mechanic-unlock.service'
import { QUEUE_NAMES } from '../../lib/queue'
import { AppError } from '../../lib/errors'

export async function mechanicRoutes(fastify: FastifyInstance): Promise<void> {
  const mechanicRepo = new MechanicRepository(fastify.db)
  const rewardDefRepo = new RewardDefinitionRepository(fastify.db)
  const playerRewardRepo = new PlayerRewardRepository(fastify.db)
  const statsRepo = new PlayerCampaignStatsRepository(fastify.db)
  const stateRepo = new PlayerMechanicStateRepository(fastify.db)
  const cacheService = new LeaderboardCacheService(fastify.redis ?? null)

  let rewardExecQueue: Queue | null = null
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const { Redis } = await import('ioredis')
      const conn = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
      rewardExecQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection: conn })
    }
  } catch { /* Redis unavailable */ }

  const dummyQueue = rewardExecQueue ?? ({ add: async () => ({}) } as unknown as Queue)

  const wheelService = new WheelService(rewardDefRepo, playerRewardRepo, dummyQueue, statsRepo)
  const wiwService = new WheelInWheelService(rewardDefRepo, playerRewardRepo, dummyQueue)
  const lbService = new LeaderboardService(statsRepo, cacheService, playerRewardRepo, rewardDefRepo, dummyQueue)
  const unlockService = new MechanicUnlockService(statsRepo, stateRepo, mechanicRepo)
  const lbLayeredService = new LeaderboardLayeredService(lbService, unlockService, mechanicRepo)
  const missionService = new MissionService(stateRepo, statsRepo, playerRewardRepo, dummyQueue)
  const progressBarService = new ProgressBarService(statsRepo, playerRewardRepo, stateRepo, dummyQueue)
  const cashoutService = new CashoutService(playerRewardRepo, statsRepo, dummyQueue)

  fastify.addHook('onClose', async () => { await rewardExecQueue?.close() })

  async function loadAndValidateMechanic(mechanicId: string, playerId: string) {
    const mechanic = await mechanicRepo.findById(mechanicId)
    if (!mechanic) throw new AppError('MECHANIC_NOT_FOUND', 'Mechanic not found', 404)
    
    const [campaign] = await fastify.db.select().from(campaigns).where(eq(campaigns.id, mechanic.campaignId)).limit(1)
    if (!campaign || campaign.status !== 'active') throw new AppError('CAMPAIGN_NOT_ACTIVE', 'Campaign is not active', 400)
    
    const [optin] = await fastify.db.select().from(playerCampaignOptins).where(and(eq(playerCampaignOptins.playerId, playerId), eq(playerCampaignOptins.campaignId, campaign.id))).limit(1)
    if (!optin) throw new AppError('NOT_OPTED_IN', 'Player has not opted into this campaign', 403)
    
    return { mechanic, campaign }
  }

  // POST /api/v1/mechanics/:mechanicId/spin
  fastify.post<{ Params: { mechanicId: string } }>(
    '/api/v1/mechanics/:mechanicId/spin',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        
        if (mechanic.type === 'WHEEL') {
          const result = await wheelService.spin(request.player.id, mechanic)
          return sendSuccess(reply, result)
        } else if (mechanic.type === 'WHEEL_IN_WHEEL') {
          const result = await wiwService.spin(request.player.id, mechanic)
          return sendSuccess(reply, result)
        }
        
        return sendError(reply, 'VALIDATION_ERROR', 'This mechanic does not support spin')
      } catch (err) {
        if (err instanceof AppError) {
          fastify.log.warn({ code: err.code, message: err.message, mechanicId: request.params.mechanicId, playerId: request.player?.id }, 'spin failed')
        }
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/mechanics/:mechanicId/leaderboard
  fastify.get<{ Params: { mechanicId: string }; Querystring: { page?: string; pageSize?: string; layer?: string } }>(
    '/api/v1/mechanics/:mechanicId/leaderboard',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1)
        const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize ?? '20', 10) || 20))
        const layer = request.query.layer

        let result
        if (mechanic.type === 'LEADERBOARD_LAYERED') {
          if (layer === '2') {
            const lb2 = await lbLayeredService.getLeaderboard2(request.player.id, mechanic, page, pageSize)
            if ('type' in lb2 && lb2.type === 'locked') {
              return sendSuccess(reply, lb2)
            }
            result = lb2 as Awaited<ReturnType<typeof lbService.getPlayerRank>>
          } else {
            result = await lbLayeredService.getLeaderboard1(request.player.id, mechanic, page, pageSize)
          }
        } else {
          result = await lbService.getPlayerRank(request.player.id, mechanic, page, pageSize)
        }

        const entries = result.entries.map((e) => ({
          ...e,
          displayName: anonymizeName(e.displayName),
          isCurrentPlayer: e.playerId === request.player.id,
        }))
        
        return sendSuccess(reply, {
          entries,
          playerRank: result.playerRank,
          meta: {
            totalParticipants: result.total,
            totalPages: Math.ceil(result.total / pageSize),
            currentPage: page,
          },
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/mechanics/:mechanicId/missions
  fastify.get<{ Params: { mechanicId: string } }>(
    '/api/v1/mechanics/:mechanicId/missions',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        const result = await missionService.getProgress(request.player.id, mechanic)
        return sendSuccess(reply, result)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // POST /api/v1/mechanics/:mechanicId/missions/:stepId/claim
  fastify.post<{ Params: { mechanicId: string; stepId: string } }>(
    '/api/v1/mechanics/:mechanicId/missions/:stepId/claim',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        const result = await missionService.claimStep(request.player.id, mechanic, request.params.stepId)
        return sendSuccess(reply, result)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // POST /api/v1/mechanics/:mechanicId/claim-progress
  fastify.post<{ Params: { mechanicId: string } }>(
    '/api/v1/mechanics/:mechanicId/claim-progress',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        if (mechanic.type !== 'PROGRESS_BAR') {
          return sendError(reply, 'VALIDATION_ERROR', 'This mechanic does not support progress claim')
        }
        const result = await progressBarService.claimProgress(request.player.id, mechanic)
        return sendSuccess(reply, result)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // POST /api/v1/mechanics/:mechanicId/claim (cashout)
  fastify.post<{ Params: { mechanicId: string } }>(
    '/api/v1/mechanics/:mechanicId/claim',
    async (request, reply) => {
      try {
        const { mechanic } = await loadAndValidateMechanic(request.params.mechanicId, request.player.id)
        if (mechanic.type !== 'CASHOUT') {
          return sendError(reply, 'VALIDATION_ERROR', 'This mechanic does not support cashout claims')
        }
        const result = await cashoutService.claim(request.player.id, mechanic)
        return sendSuccess(reply, result)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}

function anonymizeName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]![0]}.`
  }
  return name.length > 3 ? `${name.slice(0, 3)}...` : name
}
