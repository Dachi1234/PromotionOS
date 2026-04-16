import type { FastifyInstance } from 'fastify'
import { eq, asc } from 'drizzle-orm'
import { campaigns, mechanics, playerCampaignOptins } from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError } from '../../lib/response'
import { PlayerStateAssemblerService } from '../../services/player-state-assembler.service'
import { MechanicUnlockService } from '../../services/mechanics/mechanic-unlock.service'
import { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import { PlayerMechanicStateRepository } from '../../repositories/player-mechanic-state.repository'
import { MechanicRepository } from '../../repositories/mechanic.repository'
import { CampaignRepository } from '../../modules/campaigns/campaign.repository'

export async function playerStateRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/campaigns/:slug/player-state
  fastify.get<{ Params: { slug: string } }>(
    '/api/v1/campaigns/:slug/player-state',
    async (request, reply) => {
      try {
        const player = request.player
        const [campaign] = await fastify.db.select().from(campaigns).where(eq(campaigns.slug, request.params.slug)).limit(1)
        if (!campaign || !['active', 'ended'].includes(campaign.status)) {
          return sendError(reply, 'CAMPAIGN_NOT_FOUND')
        }

        const { and } = await import('drizzle-orm')
        const [optin] = await fastify.db.select().from(playerCampaignOptins).where(and(eq(playerCampaignOptins.playerId, player.id), eq(playerCampaignOptins.campaignId, campaign.id))).limit(1)
        if (!optin) {
          return sendError(reply, 'NOT_OPTED_IN')
        }

        const campaignMechanics = await fastify.db.select().from(mechanics).where(eq(mechanics.campaignId, campaign.id)).orderBy(asc(mechanics.displayOrder))

        // Build services - we need Redis connection for leaderboard cache but it's optional
        const statsRepo = new PlayerCampaignStatsRepository(fastify.db)
        const playerRewardRepo = new PlayerRewardRepository(fastify.db)
        const stateRepo = new PlayerMechanicStateRepository(fastify.db)
        const mechanicRepo = new MechanicRepository(fastify.db)
        const unlockService = new MechanicUnlockService(statsRepo, stateRepo, mechanicRepo)
        
        // Use null for Redis/BullMQ connection since we're in route context
        // Services that need queues will be created with null queue (read-only ops)
        const { LeaderboardCacheService } = await import('../../services/mechanics/leaderboard-cache.service')
        const { LeaderboardService } = await import('../../services/mechanics/leaderboard.service')
        const { LeaderboardLayeredService } = await import('../../services/mechanics/leaderboard-layered.service')
        const { MissionService } = await import('../../services/mechanics/mission.service')
        const { ProgressBarService } = await import('../../services/mechanics/progress-bar.service')
        const { CashoutService } = await import('../../services/mechanics/cashout.service')
        const { WheelService } = await import('../../services/mechanics/wheel.service')
        const { WheelInWheelService } = await import('../../services/mechanics/wheel-in-wheel.service')
        const { RewardDefinitionRepository } = await import('../../repositories/reward-definition.repository')
        
        const rewardDefRepo = new RewardDefinitionRepository(fastify.db)
        const cacheService = new LeaderboardCacheService(fastify.redis ?? null)
        
        const dummyQueue = { add: async () => ({}) } as unknown as import('bullmq').Queue
        
        const wheelService = new WheelService(rewardDefRepo, playerRewardRepo, dummyQueue)
        const wiwService = new WheelInWheelService(rewardDefRepo, playerRewardRepo, dummyQueue)
        const campaignRepo = new CampaignRepository(fastify.db)
        const lbService = new LeaderboardService(statsRepo, cacheService, playerRewardRepo, rewardDefRepo, dummyQueue, campaignRepo)
        const lbLayeredService = new LeaderboardLayeredService(lbService, unlockService, mechanicRepo)
        const missionService = new MissionService(stateRepo, statsRepo, playerRewardRepo, dummyQueue)
        const pbService = new ProgressBarService(statsRepo, playerRewardRepo, stateRepo, dummyQueue, fastify.db)
        const cashoutService = new CashoutService(playerRewardRepo, statsRepo, dummyQueue)

        const assembler = new PlayerStateAssemblerService(
          wheelService, wiwService, lbService, lbLayeredService,
          missionService, pbService, cashoutService, unlockService,
          playerRewardRepo, statsRepo,
        )

        const state = await assembler.assembleState(player, campaignMechanics)
        return sendSuccess(reply, state)
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
