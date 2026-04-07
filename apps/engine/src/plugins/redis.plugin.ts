import fp from 'fastify-plugin'
import { Redis } from 'ioredis'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null
  }
}

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    fastify.log.warn(
      'REDIS_URL is not set — Redis plugin skipped. Worker features requiring Redis will be unavailable.',
    )
    fastify.decorate('redis', null)
    return
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })

  redis.on('error', (err: Error) => {
    fastify.log.error({ err }, 'Redis connection error')
  })

  redis.on('connect', () => {
    fastify.log.info('Redis connected')
  })

  try {
    await redis.connect()
  } catch (err) {
    fastify.log.warn({ err }, 'Redis failed to connect — continuing without Redis')
    fastify.decorate('redis', null)
    return
  }

  fastify.decorate('redis', redis)

  fastify.addHook('onClose', async () => {
    await redis.quit()
  })

  fastify.log.info('Redis plugin registered')
})
