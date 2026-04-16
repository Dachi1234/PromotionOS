import type { Queue } from 'bullmq'
import type { Mechanic, RewardDefinition, PlayerCampaignStat } from '@promotionos/db'
import type { LeaderboardResult } from '@promotionos/types'
import type { PlayerCampaignStatsRepository } from '../../repositories/player-campaign-stats.repository'
import type { LeaderboardCacheService } from './leaderboard-cache.service'
import type { PlayerRewardRepository } from '../../repositories/player-reward.repository'
import type { RewardDefinitionRepository } from '../../repositories/reward-definition.repository'
import { AppError } from '../../lib/errors'
import { calculateWindowBounds } from '../window-calculator.service'

/**
 * Minimal interface used by LeaderboardService to resolve a campaign's
 * startsAt/endsAt when computing a `campaign` window_type leaderboard.
 *
 * Exposing an interface (rather than depending on a concrete repository)
 * decouples this service from any particular campaign-repository class
 * and keeps unit tests simple (pass a stub).
 */
export interface CampaignDatesProvider {
  findById(id: string): Promise<{ startsAt: Date | string; endsAt: Date | string } | null>
}

export interface LeaderboardConfig {
  ranking_metric: string
  window_type: 'daily' | 'weekly' | 'campaign'
  tie_breaking: 'first_to_reach' | 'highest_secondary' | 'split'
  secondary_metric?: string
  max_displayed_ranks: number
  prize_distribution: {
    from_rank: number
    to_rank: number
    reward_definition_id: string
  }[]
}

interface RankedEntry {
  rank: number
  playerId: string
  value: number
  displayName: string
}

export class LeaderboardService {
  constructor(
    private readonly statsRepo: PlayerCampaignStatsRepository,
    private readonly cacheService: LeaderboardCacheService,
    private readonly playerRewardRepo: PlayerRewardRepository,
    private readonly rewardDefRepo: RewardDefinitionRepository,
    private readonly rewardExecutionQueue: Queue,
    private readonly campaignDatesProvider: CampaignDatesProvider,
  ) {}

  /**
   * Resolve a campaign's start/end dates for window-bounds calculation.
   *
   * The cache key for a `campaign` window is derived from `windowStart`,
   * so reads and writes MUST agree on the campaign's startsAt. Previously
   * this method fell back to `new Date(0)` when the campaign couldn't be
   * loaded, producing cache-key drift and silently empty leaderboards.
   * We now throw — the caller either has campaign dates in hand (fast path)
   * or the campaign genuinely doesn't exist (real error).
   */
  private async resolveCampaignDates(
    campaignId: string,
    provided?: { startsAt: Date; endsAt: Date },
  ): Promise<{ startsAt: Date; endsAt: Date }> {
    if (provided) return provided
    const campaign = await this.campaignDatesProvider.findById(campaignId)
    if (!campaign) {
      throw new AppError(
        'CAMPAIGN_NOT_FOUND',
        `LeaderboardService: campaign ${campaignId} not found; cannot resolve window bounds`,
        404,
      )
    }
    return {
      startsAt: new Date(campaign.startsAt),
      endsAt: new Date(campaign.endsAt),
    }
  }

  async getPlayerRank(
    playerId: string,
    mechanic: Mechanic,
    page = 1,
    pageSize = 20,
    campaignDates?: { startsAt: Date; endsAt: Date },
  ): Promise<LeaderboardResult> {
    const config = mechanic.config as LeaderboardConfig
    const entries = await this.computeRankings(mechanic.id, mechanic.campaignId, config, campaignDates)

    const start = (page - 1) * pageSize
    const pageEntries = entries.slice(start, start + pageSize)
    const playerEntry = entries.find((e) => e.playerId === playerId)

    return {
      type: 'leaderboard' as const,
      entries: pageEntries,
      playerRank: playerEntry?.rank ?? null,
      total: entries.length,
      page,
      pageSize,
    }
  }

  async computeRankings(
    mechanicId: string,
    campaignId: string,
    config: LeaderboardConfig,
    campaignDates?: { startsAt: Date; endsAt: Date },
  ): Promise<RankedEntry[]> {
    const now = new Date()
    const dates = config.window_type === 'campaign'
      ? await this.resolveCampaignDates(campaignId, campaignDates)
      : undefined
    const { windowStart } = calculateWindowBounds(
      config.window_type,
      now,
      dates?.startsAt,
      dates?.endsAt,
    )

    const cached = await this.cacheService.get(
      mechanicId,
      config.window_type,
      windowStart.toISOString(),
    )

    let rawEntries: { playerId: string; value: number; lastUpdatedAt: Date }[]

    if (cached) {
      rawEntries = cached.map((e) => ({
        playerId: e.playerId,
        value: e.value,
        lastUpdatedAt: new Date(),
      }))
    } else {
      const stats = await this.statsRepo.findRankedByMetric(
        campaignId,
        mechanicId,
        config.ranking_metric,
        config.window_type,
        windowStart,
        'desc',
      )
      rawEntries = stats.map((s) => ({
        playerId: s.playerId,
        value: Number(s.value),
        lastUpdatedAt: s.lastUpdatedAt,
      }))
    }

    return this.assignRanks(rawEntries, config.tie_breaking)
  }

  async refreshCache(
    mechanicId: string,
    campaignId: string,
    config: LeaderboardConfig,
    campaignDates?: { startsAt: Date; endsAt: Date },
  ): Promise<void> {
    const now = new Date()
    const dates = config.window_type === 'campaign'
      ? await this.resolveCampaignDates(campaignId, campaignDates)
      : undefined
    const { windowStart } = calculateWindowBounds(
      config.window_type,
      now,
      dates?.startsAt,
      dates?.endsAt,
    )

    const stats = await this.statsRepo.findRankedByMetric(
      campaignId,
      mechanicId,
      config.ranking_metric,
      config.window_type,
      windowStart,
      'desc',
    )

    await this.cacheService.set(
      mechanicId,
      config.window_type,
      windowStart.toISOString(),
      stats.map((s) => ({ playerId: s.playerId, value: Number(s.value) })),
    )
  }

  /**
   * Finalize a leaderboard window and distribute prizes.
   * @param windowStart - If provided, compute rankings for this specific window
   *   instead of the current one. Used for per-window finalization (daily/weekly).
   */
  async finalize(
    mechanicId: string,
    campaignId: string,
    config: LeaderboardConfig,
    windowStart?: Date,
  ): Promise<void> {
    const rankings = windowStart
      ? await this.computeRankingsForWindow(mechanicId, campaignId, config, windowStart)
      : await this.computeRankings(mechanicId, campaignId, config)

    for (const prize of config.prize_distribution) {
      const eligible = rankings.filter(
        (r) => r.rank >= prize.from_rank && r.rank <= prize.to_rank,
      )

      for (const entry of eligible) {
        // Deduplication: skip if this player already received this reward
        // for this mechanic since the window started
        if (windowStart) {
          const existingCount = await this.playerRewardRepo.countByMechanicAndPlayerSince(
            mechanicId,
            entry.playerId,
            windowStart,
          )
          if (existingCount > 0) continue
        }

        const playerReward = await this.playerRewardRepo.create({
          playerId: entry.playerId,
          campaignId,
          mechanicId,
          rewardDefinitionId: prize.reward_definition_id,
          status: 'pending',
          grantedAt: new Date(),
        })

        await this.rewardExecutionQueue.add('execute-reward', {
          playerRewardId: playerReward.id,
        })
      }
    }
  }

  /**
   * Compute rankings for a specific historical window (used during finalization).
   */
  async computeRankingsForWindow(
    mechanicId: string,
    campaignId: string,
    config: LeaderboardConfig,
    windowStart: Date,
  ): Promise<RankedEntry[]> {
    const stats = await this.statsRepo.findRankedByMetric(
      campaignId,
      mechanicId,
      config.ranking_metric,
      config.window_type,
      windowStart,
      'desc',
    )

    const rawEntries = stats.map((s) => ({
      playerId: s.playerId,
      value: Number(s.value),
      lastUpdatedAt: s.lastUpdatedAt,
    }))

    return this.assignRanks(rawEntries, config.tie_breaking)
  }

  private assignRanks(
    entries: { playerId: string; value: number; lastUpdatedAt: Date }[],
    tieBreaking: string,
  ): RankedEntry[] {
    if (entries.length === 0) return []

    const sorted = [...entries].sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      if (tieBreaking === 'first_to_reach') {
        return a.lastUpdatedAt.getTime() - b.lastUpdatedAt.getTime()
      }
      return 0
    })

    const result: RankedEntry[] = []
    let currentRank = 1

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i]!
      if (tieBreaking === 'split' && i > 0 && sorted[i - 1]!.value === entry.value) {
        result.push({
          rank: result[i - 1]!.rank,
          playerId: entry.playerId,
          value: entry.value,
          displayName: entry.playerId.slice(0, 8),
        })
      } else {
        result.push({
          rank: currentRank,
          playerId: entry.playerId,
          value: entry.value,
          displayName: entry.playerId.slice(0, 8),
        })
      }
      currentRank = i + 2
    }

    return result
  }
}
