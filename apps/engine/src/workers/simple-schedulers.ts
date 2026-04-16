import type { Queue } from 'bullmq'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@promotionos/db'
import type { Redis } from 'ioredis'
import { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import { CampaignRepository } from '../modules/campaigns/campaign.repository'
import { MechanicRepository } from '../repositories/mechanic.repository'
import { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import { PlayerRewardRepository } from '../repositories/player-reward.repository'
import { RewardDefinitionRepository } from '../repositories/reward-definition.repository'
import { PlayerMechanicStateRepository } from '../repositories/player-mechanic-state.repository'
import { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import { RawEventRepository } from '../repositories/raw-event.repository'
import { SegmentMaterializerService } from '../services/segment-materializer.service'
import { LeaderboardService } from '../services/mechanics/leaderboard.service'
import { LeaderboardCacheService } from '../services/mechanics/leaderboard-cache.service'
import { ConditionProgressCheckerService } from '../services/mechanics/condition-progress-checker.service'
import type { TransformationConfig } from '@promotionos/types'
import { applyTransformationChain, extractValueFromPayload } from '../services/transformation-evaluator.service'
import { calculateWindowBounds } from '../services/window-calculator.service'
import type { LeaderboardConfig } from '../services/mechanics/leaderboard.service'

type Db = PostgresJsDatabase<typeof schema>

export interface SimpleSchedulerRegistry {
  stop: () => void
}

export function startSimpleSchedulers(
  db: Db,
  redisClient: Redis | null,
  rewardExecQueue: Queue,
): SimpleSchedulerRegistry {
  const timers: ReturnType<typeof setInterval>[] = []

  // --- Campaign Scheduler (every 60s) ---
  const campaignRepo = new CampaignSchedulerRepository(db)
  const segmentMaterializer = new SegmentMaterializerService(campaignRepo)

  const campaignTimer = setInterval(async () => {
    try {
      const now = new Date()
      const readyToActivate = await campaignRepo.findScheduledReadyToActivate(now)
      for (const campaign of readyToActivate) {
        try {
          await campaignRepo.updateStatus(campaign.id, 'active')
          console.log(`[CampaignScheduler] Activated campaign: ${campaign.slug}`)
          if (campaign.targetSegmentId) {
            const segment = await campaignRepo.findCampaignSegment(campaign.id)
            if (segment?.segmentRuleConfig) {
              await segmentMaterializer.materializeAndSnapshot(campaign.id, segment.segmentRuleConfig)
            }
          }
        } catch (err) {
          console.error(`[CampaignScheduler] Failed to activate ${campaign.slug}:`, err)
        }
      }
      const readyToEnd = await campaignRepo.findActiveReadyToEnd(now)
      for (const campaign of readyToEnd) {
        try {
          await campaignRepo.updateStatus(campaign.id, 'ended')
          console.log(`[CampaignScheduler] Ended campaign: ${campaign.slug}`)
          await finalizeLeaderboardsForCampaign(campaign.id)
        } catch (err) {
          console.error(`[CampaignScheduler] Failed to end ${campaign.slug}:`, err)
        }
      }
    } catch (err) {
      console.error('[CampaignScheduler] Error:', err)
    }
  }, 60_000)
  timers.push(campaignTimer)
  console.log('[CampaignScheduler] Running (setInterval 60s)')

  // --- Shared services ---
  const mechanicRepo = new MechanicRepository(db)
  const statsRepo = new PlayerCampaignStatsRepository(db)
  const cacheService = new LeaderboardCacheService(redisClient)
  const playerRewardRepo = new PlayerRewardRepository(db)
  const rewardDefRepo = new RewardDefinitionRepository(db)

  // LeaderboardService needs a CampaignDatesProvider (findById returning
  // startsAt/endsAt). CampaignSchedulerRepository above doesn't expose that,
  // so we construct the canonical CampaignRepository here as a light adapter.
  const campaignDatesProvider = new CampaignRepository(db)

  const leaderboardService = new LeaderboardService(
    statsRepo, cacheService, playerRewardRepo, rewardDefRepo, rewardExecQueue, campaignDatesProvider,
  )

  async function finalizeLeaderboardsForCampaign(campaignId: string) {
    try {
      const mechanics = await mechanicRepo.findByCampaignId(campaignId)
      const lbMechanics = mechanics.filter(
        (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
      )
      for (const mechanic of lbMechanics) {
        const config = mechanic.config as Record<string, unknown>
        if (mechanic.type === 'LEADERBOARD_LAYERED') {
          const lb1 = config.leaderboard_1 as any
          const lb2 = config.leaderboard_2 as any
          if (lb1) await leaderboardService.finalize(mechanic.id, campaignId, lb1)
          if (lb2) await leaderboardService.finalize(mechanic.id, campaignId, lb2)
        } else {
          await leaderboardService.finalize(mechanic.id, campaignId, config as any)
        }
        console.log(`[LeaderboardFinalizer] Finalized mechanic ${mechanic.id}`)
      }
    } catch (err) {
      console.error(`[LeaderboardFinalizer] Failed for campaign ${campaignId}:`, err)
    }
  }

  // --- Leaderboard Refresher (every 30s) ---

  const lbRefreshTimer = setInterval(async () => {
    try {
      const activeCampaigns = await campaignRepo.findActiveCampaigns()
      for (const campaign of activeCampaigns) {
        const mechanics = await mechanicRepo.findByCampaignId(campaign.id)
        const lbMechanics = mechanics.filter(
          (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
        )
        for (const mechanic of lbMechanics) {
          try {
            const rawConfig = mechanic.config as Record<string, unknown>
            const campaignDates = { startsAt: new Date(campaign.startsAt), endsAt: new Date(campaign.endsAt) }
            if (mechanic.type === 'LEADERBOARD_LAYERED') {
              const lb1 = rawConfig.leaderboard_1 as Record<string, unknown> | undefined
              const lb2 = rawConfig.leaderboard_2 as Record<string, unknown> | undefined
              if (lb1?.window_type && lb1?.ranking_metric) {
                await leaderboardService.refreshCache(mechanic.id, campaign.id, lb1 as any, campaignDates)
              }
              if (lb2?.window_type && lb2?.ranking_metric) {
                await leaderboardService.refreshCache(mechanic.id, campaign.id, lb2 as any, campaignDates)
              }
            } else if (rawConfig?.window_type && rawConfig?.ranking_metric) {
              await leaderboardService.refreshCache(mechanic.id, campaign.id, rawConfig as any, campaignDates)
            }
          } catch { /* skip individual mechanic errors */ }
        }
      }
    } catch (err) {
      console.error('[LeaderboardRefresher] Error:', err)
    }
  }, 30_000)
  timers.push(lbRefreshTimer)
  console.log('[LeaderboardRefresher] Running (setInterval 30s)')

  // --- Condition Expiry Checker (every 5min) ---
  const stateRepo = new PlayerMechanicStateRepository(db)
  const conditionChecker = new ConditionProgressCheckerService(playerRewardRepo, statsRepo, rewardExecQueue)

  const expiryTimer = setInterval(async () => {
    try {
      const pendingRewards = await playerRewardRepo.findExpiredConditionPending()
      const now = new Date()
      for (const reward of pendingRewards) {
        const snapshot = reward.conditionSnapshot as { expires_at?: string; on_failure?: string } | null
        if (!snapshot?.expires_at || new Date(snapshot.expires_at) > now) continue
        await conditionChecker.handleExpiry(reward.id, snapshot as any)
      }
    } catch (err) {
      console.error('[ConditionExpiryChecker] Error:', err)
    }
  }, 300_000)
  timers.push(expiryTimer)
  console.log('[ConditionExpiryChecker] Running (setInterval 5min)')

  // --- Window Recalculator (every 60s for minute windows, hourly for others) ---
  const aggRuleRepo = new AggregationRuleRepository(db)
  const rawEventRepo = new RawEventRepository(db)

  const windowTimer = setInterval(async () => {
    for (const windowType of ['minute', 'hourly', 'daily', 'weekly'] as const) {
      try {
        const rules = await aggRuleRepo.findActiveRulesByWindowType(windowType)
        if (rules.length === 0) continue
        const now = new Date()
        for (const rule of rules) {
          const window = calculateWindowBounds(rule.windowType, now, rule.campaignStartsAt, rule.campaignEndsAt, rule.windowSizeHours)
          const events = await rawEventRepo.fetchEventsInWindow('', rule.sourceEventType, window.windowStart, window.windowEnd)
          const playerAggs = new Map<string, { sum: number; count: number }>()
          for (const event of events) {
            const payload = event.payload as Record<string, unknown>
            const transformation = rule.transformation as TransformationConfig | TransformationConfig[]
            const field = Array.isArray(transformation) ? transformation[0]?.field : transformation.field
            const rawValue = extractValueFromPayload(payload, field)
            const { transformedValue } = applyTransformationChain(rawValue, transformation)
            const existing = playerAggs.get(event.playerId) ?? { sum: 0, count: 0 }
            existing.sum += transformedValue
            existing.count += 1
            playerAggs.set(event.playerId, existing)
          }
          for (const [playerId, agg] of playerAggs) {
            let finalValue: number
            switch (rule.metric) {
              case 'COUNT': finalValue = agg.count; break
              case 'SUM': finalValue = agg.sum; break
              case 'AVERAGE': finalValue = agg.count > 0 ? agg.sum / agg.count : 0; break
              default: continue
            }
            await statsRepo.setAbsolute({
              playerId, campaignId: rule.campaignId, mechanicId: rule.mechanicId,
              metricType: rule.metric, windowType, windowStart: window.windowStart,
              value: finalValue, sampleCount: agg.count,
            })
          }
        }
      } catch (err) {
        console.error(`[WindowRecalculator] Error for ${windowType}:`, err)
      }
    }
  }, 60_000)
  timers.push(windowTimer)
  console.log('[WindowRecalculator] Running (setInterval 60s)')

  // --- Leaderboard Window Finalizer (every 60s) ---
  // Checks if any daily/weekly leaderboard windows have closed and need finalization.
  // Uses playerMechanicState with a nil UUID to track which windows are already finalized.
  const SYSTEM_FINALIZER_ID = '00000000-0000-0000-0000-000000000000'

  const lbFinalizerTimer = setInterval(async () => {
    try {
      const activeCampaigns = await campaignRepo.findActiveCampaigns()

      for (const campaign of activeCampaigns) {
        const allMechanics = await mechanicRepo.findByCampaignId(campaign.id)
        const lbMechanics = allMechanics.filter(
          (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
        )

        for (const mechanic of lbMechanics) {
          try {
            const rawConfig = mechanic.config as Record<string, unknown>

            // Collect the leaderboard configs to check (layered has two sub-configs)
            const configsToCheck: { config: LeaderboardConfig; label: string }[] = []
            if (mechanic.type === 'LEADERBOARD_LAYERED') {
              const lb1 = rawConfig.leaderboard_1 as LeaderboardConfig | undefined
              const lb2 = rawConfig.leaderboard_2 as LeaderboardConfig | undefined
              if (lb1) configsToCheck.push({ config: lb1, label: 'lb1' })
              if (lb2) configsToCheck.push({ config: lb2, label: 'lb2' })
            } else {
              configsToCheck.push({ config: rawConfig as unknown as LeaderboardConfig, label: 'default' })
            }

            for (const { config, label } of configsToCheck) {
              const windowType = config.window_type ?? 'campaign'

              // Skip campaign-level windows (handled at campaign end)
              if (windowType === 'campaign') continue
              if (!config.prize_distribution || config.prize_distribution.length === 0) continue

              const now = new Date()
              const { windowStart: currentWindowStart } = calculateWindowBounds(
                windowType,
                now,
                campaign.startsAt,
                campaign.endsAt,
              )

              // The previous window is the one that just ended (1ms before current window start)
              const prevTime = new Date(currentWindowStart.getTime() - 1)
              const { windowStart: prevWindowStart } = calculateWindowBounds(
                windowType,
                prevTime,
                campaign.startsAt,
                campaign.endsAt,
              )

              // Only finalize if the previous window started after (or at) campaign start
              if (prevWindowStart < campaign.startsAt) continue

              // Check if already finalized using playerMechanicState with system player
              const finalizationKey = `finalized_${label}_${windowType}_${prevWindowStart.toISOString()}`
              const existing = await stateRepo.findByPlayerAndMechanic(SYSTEM_FINALIZER_ID, mechanic.id)
              const existingState = (existing?.state as Record<string, unknown>) ?? {}

              if (existingState[finalizationKey]) continue // Already finalized

              console.log(
                `[LeaderboardFinalizer] Finalizing ${windowType} window for mechanic ${mechanic.id}` +
                ` (${label}, window: ${prevWindowStart.toISOString()})`,
              )

              // Run finalization with the previous window's start time
              await leaderboardService.finalize(mechanic.id, campaign.id, config, prevWindowStart)

              // Mark as finalized
              const updatedState = { ...existingState, [finalizationKey]: new Date().toISOString() }
              await stateRepo.upsert(SYSTEM_FINALIZER_ID, mechanic.id, updatedState)

              console.log(
                `[LeaderboardFinalizer] Finalized ${windowType} window for mechanic ${mechanic.id} (${label})`,
              )
            }
          } catch (err) {
            console.error(`[LeaderboardFinalizer] Error for mechanic ${mechanic.id}:`, err)
          }
        }
      }
    } catch (err) {
      console.error('[LeaderboardFinalizer] Error:', err)
    }
  }, 60_000)
  timers.push(lbFinalizerTimer)
  console.log('[LeaderboardFinalizer] Running (setInterval 60s)')

  return {
    stop: () => {
      for (const timer of timers) clearInterval(timer)
      console.log('[SimpleSchedulers] All timers stopped')
    },
  }
}
