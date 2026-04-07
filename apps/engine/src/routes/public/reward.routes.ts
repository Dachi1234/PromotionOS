import type { FastifyInstance } from 'fastify'
import { eq, and, desc, count } from 'drizzle-orm'
import { playerRewards } from '@promotionos/db'
import type { PlayerReward } from '@promotionos/db'
import { sendSuccess, sendError, handleRouteError, paginationMeta } from '../../lib/response'
import { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import { QUEUE_NAMES } from '../../lib/queue'

export async function rewardRoutes(fastify: FastifyInstance): Promise<void> {
  const playerRewardRepo = new PlayerRewardRepository(fastify.db)

  let rewardExecQueue: import('bullmq').Queue | null = null
  try {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      const { Queue } = await import('bullmq')
      const { Redis } = await import('ioredis')
      const conn = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
      rewardExecQueue = new Queue(QUEUE_NAMES.REWARD_EXECUTION, { connection: conn })
    }
  } catch { /* Redis unavailable */ }

  fastify.addHook('onClose', async () => { await rewardExecQueue?.close() })

  // POST /api/v1/rewards/:rewardId/claim
  fastify.post<{ Params: { rewardId: string } }>(
    '/api/v1/rewards/:rewardId/claim',
    async (request, reply) => {
      try {
        const reward = await playerRewardRepo.findById(request.params.rewardId)
        if (!reward) return sendError(reply, 'REWARD_NOT_FOUND')
        if (reward.playerId !== request.player.id) return sendError(reply, 'REWARD_NOT_FOUND')
        if (reward.status !== 'pending') {
          return sendError(reply, 'REWARD_NOT_CLAIMABLE', `Reward status is "${reward.status}", must be "pending"`)
        }

        try {
          if (rewardExecQueue) {
            await rewardExecQueue.add('execute-reward', { playerRewardId: reward.id })
          }
        } catch { /* Redis unavailable, will be picked up by sweep */ }

        return sendSuccess(reply, { rewardId: reward.id, status: reward.status })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  // GET /api/v1/rewards
  fastify.get<{ Querystring: { status?: string; campaignId?: string; page?: string; pageSize?: string } }>(
    '/api/v1/rewards',
    async (request, reply) => {
      try {
        const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1)
        const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize ?? '20', 10) || 20))
        const offset = (page - 1) * pageSize

        const conditions = [eq(playerRewards.playerId, request.player.id)]
        
        const statusFilter = request.query.status
        if (statusFilter && statusFilter !== 'all') {
          const validStatuses: PlayerReward['status'][] = ['pending', 'condition_pending', 'fulfilled', 'expired', 'forfeited']
          if (validStatuses.includes(statusFilter as PlayerReward['status'])) {
            conditions.push(eq(playerRewards.status, statusFilter as PlayerReward['status']))
          }
        }

        if (request.query.campaignId) {
          conditions.push(eq(playerRewards.campaignId, request.query.campaignId))
        }

        const whereClause = and(...conditions)

        const [rewards, totalResult] = await Promise.all([
          fastify.db
            .select()
            .from(playerRewards)
            .where(whereClause)
            .orderBy(desc(playerRewards.grantedAt))
            .limit(pageSize)
            .offset(offset),
          fastify.db
            .select({ count: count() })
            .from(playerRewards)
            .where(whereClause),
        ])

        const total = Number(totalResult[0]?.count ?? 0)

        return reply.send({
          success: true,
          data: { rewards },
          meta: paginationMeta(page, pageSize, total),
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
