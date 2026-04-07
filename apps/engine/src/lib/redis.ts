import { Redis } from 'ioredis'

export function createBullMQConnection(): Redis | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

export function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    return new Redis(redisUrl, { enableReadyCheck: false })
  } catch {
    console.warn('[Redis] Failed to create client, leaderboard will use DB fallback')
    return null
  }
}
