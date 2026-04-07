import type { FastifyInstance, FastifyReply } from 'fastify'
import { sql, count, gte } from 'drizzle-orm'
import { getWorkerStatuses } from '../workers/index'
import { requireAdmin } from '../lib/jwt-user'
import { campaigns, rawEvents, playerRewards } from '@promotionos/db'

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/v1/health', async () => {
    let dbOk = false
    try {
      await fastify.db.execute(sql`SELECT 1`)
      dbOk = true
    } catch { /* db unreachable */ }

    let redisOk = false
    try {
      if (fastify.redis) {
        await fastify.redis.ping()
        redisOk = true
      }
    } catch { /* redis unreachable */ }

    const redisAvailable = fastify.redis !== null
    const workers = getWorkerStatuses(redisAvailable)

    return {
      success: true,
      data: {
        status: dbOk && redisOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '7.0.0',
        database: dbOk ? 'connected' : 'disconnected',
        redis: redisOk ? 'connected' : 'disconnected',
        workers,
        workersEnabled: process.env.ENABLE_WORKERS === 'true',
      },
    }
  })

  fastify.get('/api/v1/health/workers', async () => {
    const redisAvailable = fastify.redis !== null
    const statuses = getWorkerStatuses(redisAvailable)

    return {
      success: true,
      data: {
        workers: statuses,
        redis: redisAvailable ? 'connected' : 'disconnected',
        workersEnabled: process.env.ENABLE_WORKERS === 'true',
      },
    }
  })

  fastify.get(
    '/api/v1/health/detailed',
    { preHandler: requireAdmin },
    async (_request, reply: FastifyReply) => {
      try {
        const oneHourAgo = new Date(Date.now() - 3600_000)

        const [activeCampaigns] = await fastify.db
          .select({ value: count() })
          .from(campaigns)
          .where(sql`${campaigns.status} = 'active'`)

        const [recentEvents] = await fastify.db
          .select({ value: count() })
          .from(rawEvents)
          .where(gte(rawEvents.receivedAt, oneHourAgo))

        const [recentRewards] = await fastify.db
          .select({ value: count() })
          .from(playerRewards)
          .where(gte(playerRewards.grantedAt, oneHourAgo))

        let dbOk = true
        let redisOk = false
        try {
          if (fastify.redis) {
            await fastify.redis.ping()
            redisOk = true
          }
        } catch { /* redis unreachable */ }

        const redisAvailable = fastify.redis !== null
        const workers = getWorkerStatuses(redisAvailable)

        return reply.send({
          success: true,
          data: {
            status: dbOk && redisOk ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '7.0.0',
            database: 'connected',
            redis: redisOk ? 'connected' : 'disconnected',
            workers,
            metrics: {
              activeCampaigns: activeCampaigns?.value ?? 0,
              eventsLastHour: recentEvents?.value ?? 0,
              rewardsLastHour: recentRewards?.value ?? 0,
            },
          },
        })
      } catch (err) {
        return reply.code(500).send({
          success: false,
          error: { code: 'HEALTH_CHECK_FAILED', message: String(err) },
        })
      }
    },
  )
}
