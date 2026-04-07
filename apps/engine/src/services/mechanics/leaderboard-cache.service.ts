import type { Redis } from 'ioredis'

interface LeaderboardEntry {
  playerId: string
  value: number
}

const CACHE_TTL = 35

export class LeaderboardCacheService {
  constructor(private readonly redis: Redis | null) {}

  private buildKey(mechanicId: string, windowType: string, windowStart: string): string {
    return `leaderboard:${mechanicId}:${windowType}:${windowStart}`
  }

  async get(
    mechanicId: string,
    windowType: string,
    windowStart: string,
  ): Promise<LeaderboardEntry[] | null> {
    if (!this.redis) return null

    try {
      const key = this.buildKey(mechanicId, windowType, windowStart)
      const data = await this.redis.zrevrange(key, 0, -1, 'WITHSCORES')

      if (!data || data.length === 0) return null

      const entries: LeaderboardEntry[] = []
      for (let i = 0; i < data.length; i += 2) {
        entries.push({
          playerId: data[i]!,
          value: parseFloat(data[i + 1]!),
        })
      }
      return entries
    } catch (err) {
      console.warn('[LeaderboardCache] Redis read failed, falling back to DB', err)
      return null
    }
  }

  async set(
    mechanicId: string,
    windowType: string,
    windowStart: string,
    entries: LeaderboardEntry[],
  ): Promise<void> {
    if (!this.redis || entries.length === 0) return

    try {
      const key = this.buildKey(mechanicId, windowType, windowStart)
      const pipeline = this.redis.pipeline()
      pipeline.del(key)

      for (const entry of entries) {
        pipeline.zadd(key, entry.value, entry.playerId)
      }

      pipeline.expire(key, CACHE_TTL)
      await pipeline.exec()
    } catch (err) {
      console.warn('[LeaderboardCache] Redis write failed', err)
    }
  }
}
