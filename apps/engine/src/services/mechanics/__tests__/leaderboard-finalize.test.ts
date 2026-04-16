import { describe, it, expect, beforeEach } from 'vitest'
import { LeaderboardService, type LeaderboardConfig, type CampaignDatesProvider } from '../leaderboard.service'
import type { PlayerCampaignStatsRepository } from '../../../repositories/player-campaign-stats.repository'
import type { PlayerRewardRepository } from '../../../repositories/player-reward.repository'
import type { RewardDefinitionRepository } from '../../../repositories/reward-definition.repository'
import type { LeaderboardCacheService } from '../leaderboard-cache.service'
import type { Queue } from 'bullmq'

/**
 * Finalization tests corresponding to INTEGRATION-TEST-RESULTS.md entries
 * T5 / T11 / T14. These pin down the prize-distribution + queue-emission
 * contract that the leaderboard-finalizer worker relies on:
 *
 *   T5:  top 1–5 -> EXTRA_SPIN×N  (single tier, EXTRA_SPIN -> wheel)
 *   T11: 1–3 -> CASH  | 4–10 -> CASHBACK  (two disjoint tiers, terminal rewards)
 *   T14: 1–5 -> FREE_SPINS | 6–20 -> FREE_BET (two disjoint tiers, external rewards)
 *
 * We unit-test the service directly with in-memory fakes rather than
 * spin up Postgres + Redis, so these remain fast and deterministic. The
 * BullMQ queue is faked too — we only care that `add('execute-reward', …)`
 * is called per granted reward, since that's the contract the real worker
 * consumes.
 */

type StatRow = {
  playerId: string
  value: number
  lastUpdatedAt: Date
}

type QueuedJob = { name: string; data: { playerRewardId: string } }

// ---- Fakes ----

function makeStatsRepo(rows: StatRow[]) {
  return {
    findRankedByMetric: async (
      _campaignId: string,
      _mechanicId: string,
      _metric: string,
      _windowType: string,
      _windowStart: Date,
      _direction: 'asc' | 'desc',
    ) => rows,
  } as unknown as PlayerCampaignStatsRepository
}

function makeCacheService() {
  return {
    get: async () => null,
    set: async () => {},
  } as unknown as LeaderboardCacheService
}

function makePlayerRewardRepo(
  createdBucket: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>,
  existingByPlayer: Record<string, number> = {},
) {
  let seq = 0
  return {
    create: async (input: {
      playerId: string
      campaignId: string
      mechanicId: string
      rewardDefinitionId: string
      status: string
      grantedAt: Date
    }) => {
      const id = `pr-${++seq}`
      createdBucket.push({
        playerId: input.playerId,
        rewardDefinitionId: input.rewardDefinitionId,
        mechanicId: input.mechanicId,
      })
      return {
        id,
        playerId: input.playerId,
        campaignId: input.campaignId,
        mechanicId: input.mechanicId,
        rewardDefinitionId: input.rewardDefinitionId,
        status: input.status,
        grantedAt: input.grantedAt,
      }
    },
    countByMechanicAndPlayerSince: async (
      _mechanicId: string,
      playerId: string,
      _since: Date,
    ) => existingByPlayer[playerId] ?? 0,
  } as unknown as PlayerRewardRepository
}

function makeRewardDefRepo() {
  return {} as unknown as RewardDefinitionRepository
}

function makeQueue(bucket: QueuedJob[]) {
  return {
    add: async (name: string, data: { playerRewardId: string }) => {
      bucket.push({ name, data })
      return { id: `job-${bucket.length}` } as unknown
    },
  } as unknown as Queue
}

function makeCampaignDatesProvider(): CampaignDatesProvider {
  return {
    findById: async () => ({
      startsAt: new Date('2026-04-01T00:00:00.000Z'),
      endsAt: new Date('2026-04-30T23:59:59.999Z'),
    }),
  }
}

// ---- Fixtures ----

const MECHANIC_ID = 'mech-leaderboard'
const CAMPAIGN_ID = 'camp-1'
const WINDOW_START = new Date('2026-04-01T00:00:00.000Z')

function buildConfig(
  tiers: Array<{ from: number; to: number; rewardId: string }>,
): LeaderboardConfig {
  return {
    ranking_metric: 'BET_SUM',
    window_type: 'campaign',
    tie_breaking: 'first_to_reach',
    max_displayed_ranks: 20,
    prize_distribution: tiers.map((t) => ({
      from_rank: t.from,
      to_rank: t.to,
      reward_definition_id: t.rewardId,
    })),
  }
}

function buildService(opts: {
  rows: StatRow[]
  createdBucket: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>
  queuedBucket: QueuedJob[]
  existingByPlayer?: Record<string, number>
}) {
  return new LeaderboardService(
    makeStatsRepo(opts.rows),
    makeCacheService(),
    makePlayerRewardRepo(opts.createdBucket, opts.existingByPlayer),
    makeRewardDefRepo(),
    makeQueue(opts.queuedBucket),
    makeCampaignDatesProvider(),
  )
}

// ---- Tests ----

describe('LeaderboardService.finalize — T5 (single-tier EXTRA_SPIN 1–5)', () => {
  let created: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>
  let queued: QueuedJob[]

  beforeEach(() => {
    created = []
    queued = []
  })

  it('awards EXTRA_SPIN to exactly ranks 1–5 and enqueues each', async () => {
    // Seven players, sorted desc by value → ranks 1..7
    const rows: StatRow[] = [
      { playerId: 'p1', value: 1000, lastUpdatedAt: new Date(1) },
      { playerId: 'p2', value: 800, lastUpdatedAt: new Date(2) },
      { playerId: 'p3', value: 600, lastUpdatedAt: new Date(3) },
      { playerId: 'p4', value: 400, lastUpdatedAt: new Date(4) },
      { playerId: 'p5', value: 200, lastUpdatedAt: new Date(5) },
      { playerId: 'p6', value: 100, lastUpdatedAt: new Date(6) },
      { playerId: 'p7', value: 50, lastUpdatedAt: new Date(7) },
    ]
    const config = buildConfig([{ from: 1, to: 5, rewardId: 'rd-extra-spin' }])

    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })
    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    expect(created.map((c) => c.playerId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(created.every((c) => c.rewardDefinitionId === 'rd-extra-spin')).toBe(true)
    expect(queued).toHaveLength(5)
    expect(queued.every((j) => j.name === 'execute-reward')).toBe(true)
    // One queue job per player_reward created, with matching ids
    const createdIds = new Set(queued.map((j) => j.data.playerRewardId))
    expect(createdIds.size).toBe(5)
  })

  it('awards nothing when the leaderboard is empty', async () => {
    const config = buildConfig([{ from: 1, to: 5, rewardId: 'rd-extra-spin' }])
    const svc = buildService({ rows: [], createdBucket: created, queuedBucket: queued })

    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    expect(created).toHaveLength(0)
    expect(queued).toHaveLength(0)
  })

  it('clamps to available players when fewer rank than the tier range', async () => {
    const rows: StatRow[] = [
      { playerId: 'p1', value: 100, lastUpdatedAt: new Date(1) },
      { playerId: 'p2', value: 50, lastUpdatedAt: new Date(2) },
    ]
    const config = buildConfig([{ from: 1, to: 5, rewardId: 'rd-extra-spin' }])
    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })

    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    expect(created.map((c) => c.playerId)).toEqual(['p1', 'p2'])
    expect(queued).toHaveLength(2)
  })
})

describe('LeaderboardService.finalize — T11 (two tiers: CASH 1–3, CASHBACK 4–10)', () => {
  let created: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>
  let queued: QueuedJob[]

  beforeEach(() => {
    created = []
    queued = []
  })

  it('routes ranks 1–3 to CASH and 4–10 to CASHBACK with no overlap', async () => {
    const rows: StatRow[] = Array.from({ length: 12 }, (_, i) => ({
      playerId: `p${i + 1}`,
      value: 1000 - i * 50, // strictly decreasing → stable ranking 1..12
      lastUpdatedAt: new Date(i + 1),
    }))
    const config = buildConfig([
      { from: 1, to: 3, rewardId: 'rd-cash-100' },
      { from: 4, to: 10, rewardId: 'rd-cashback-50' },
    ])

    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })
    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    const byReward = created.reduce<Record<string, string[]>>((acc, c) => {
      ;(acc[c.rewardDefinitionId] ??= []).push(c.playerId)
      return acc
    }, {})

    expect(byReward['rd-cash-100']).toEqual(['p1', 'p2', 'p3'])
    expect(byReward['rd-cashback-50']).toEqual(['p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'])
    // p11, p12 out of range
    expect(created.find((c) => c.playerId === 'p11')).toBeUndefined()
    expect(created.find((c) => c.playerId === 'p12')).toBeUndefined()
    expect(queued).toHaveLength(10)
  })

  it('applies per-mechanic dedup: already-rewarded player is skipped', async () => {
    const rows: StatRow[] = [
      { playerId: 'p1', value: 100, lastUpdatedAt: new Date(1) },
      { playerId: 'p2', value: 80, lastUpdatedAt: new Date(2) },
      { playerId: 'p3', value: 60, lastUpdatedAt: new Date(3) },
    ]
    const config = buildConfig([{ from: 1, to: 3, rewardId: 'rd-cash-100' }])
    const svc = buildService({
      rows,
      createdBucket: created,
      queuedBucket: queued,
      existingByPlayer: { p2: 1 }, // p2 already has a reward for this mechanic
    })

    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    expect(created.map((c) => c.playerId)).toEqual(['p1', 'p3'])
    expect(queued).toHaveLength(2)
  })
})

describe('LeaderboardService.finalize — T14 (FREE_SPINS 1–5, FREE_BET 6–20)', () => {
  let created: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>
  let queued: QueuedJob[]

  beforeEach(() => {
    created = []
    queued = []
  })

  it('correctly partitions 20-player leaderboard into two external-reward tiers', async () => {
    const rows: StatRow[] = Array.from({ length: 22 }, (_, i) => ({
      playerId: `p${i + 1}`,
      value: 10_000 - i * 100,
      lastUpdatedAt: new Date(i + 1),
    }))
    const config = buildConfig([
      { from: 1, to: 5, rewardId: 'rd-freespins-20' },
      { from: 6, to: 20, rewardId: 'rd-freebet-50' },
    ])

    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })
    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    const freeSpinsRecipients = created
      .filter((c) => c.rewardDefinitionId === 'rd-freespins-20')
      .map((c) => c.playerId)
    const freeBetRecipients = created
      .filter((c) => c.rewardDefinitionId === 'rd-freebet-50')
      .map((c) => c.playerId)

    expect(freeSpinsRecipients).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(freeBetRecipients).toHaveLength(15)
    expect(freeBetRecipients[0]).toBe('p6')
    expect(freeBetRecipients[freeBetRecipients.length - 1]).toBe('p20')
    // p21, p22 excluded
    expect(created.find((c) => c.playerId === 'p21')).toBeUndefined()
    expect(created.find((c) => c.playerId === 'p22')).toBeUndefined()

    // Every granted reward enqueues exactly one reward-execution job
    expect(queued).toHaveLength(20)
  })
})

describe('LeaderboardService.finalize — tie-breaking', () => {
  let created: Array<{ playerId: string; rewardDefinitionId: string; mechanicId: string }>
  let queued: QueuedJob[]

  beforeEach(() => {
    created = []
    queued = []
  })

  it('first_to_reach: earlier lastUpdatedAt gets the higher rank on value tie', async () => {
    const rows: StatRow[] = [
      { playerId: 'p-late', value: 500, lastUpdatedAt: new Date('2026-04-10T12:00:00Z') },
      { playerId: 'p-early', value: 500, lastUpdatedAt: new Date('2026-04-05T12:00:00Z') },
    ]
    const config: LeaderboardConfig = {
      ...buildConfig([{ from: 1, to: 1, rewardId: 'rd-top' }]),
      tie_breaking: 'first_to_reach',
    }

    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })
    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    expect(created.map((c) => c.playerId)).toEqual(['p-early'])
  })

  it('split: tied values collapse to the same rank and both win a 1–1 tier', async () => {
    const rows: StatRow[] = [
      { playerId: 'p1', value: 500, lastUpdatedAt: new Date(1) },
      { playerId: 'p2', value: 500, lastUpdatedAt: new Date(2) },
      { playerId: 'p3', value: 100, lastUpdatedAt: new Date(3) },
    ]
    const config: LeaderboardConfig = {
      ...buildConfig([{ from: 1, to: 1, rewardId: 'rd-top' }]),
      tie_breaking: 'split',
    }

    const svc = buildService({ rows, createdBucket: created, queuedBucket: queued })
    await svc.finalize(MECHANIC_ID, CAMPAIGN_ID, config, WINDOW_START)

    // Both p1 and p2 share rank 1, so both are in [1,1]
    expect(created.map((c) => c.playerId).sort()).toEqual(['p1', 'p2'])
    expect(created.find((c) => c.playerId === 'p3')).toBeUndefined()
  })
})
