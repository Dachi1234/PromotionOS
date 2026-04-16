import type { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import type { PlayerCampaignStatsRepository } from '../repositories/player-campaign-stats.repository'
import type { TransformationConfig } from '@promotionos/types'
import { applyTransformationChain, extractValueFromPayload } from './transformation-evaluator.service'
import { calculateWindowBounds } from './window-calculator.service'
import type { RealtimePublisherService } from './realtime-publisher.service'

export interface AggregationJobPayload {
  rawEventId: string
  playerId: string
  campaignId: string
  aggregationRuleId: string
  eventType: string
  payload: Record<string, unknown>
  occurredAt: string
}

export class AggregationService {
  constructor(
    private readonly aggRuleRepo: AggregationRuleRepository,
    private readonly statsRepo: PlayerCampaignStatsRepository,
    /** Optional — if Redis is unavailable or SSE isn't wired yet, the service
     *  still works; this is best-effort realtime notification only. */
    private readonly publisher: RealtimePublisherService | null = null,
  ) {}

  async processAggregationJob(job: AggregationJobPayload): Promise<void> {
    const ruleWithDates = await this.aggRuleRepo.findByIdWithCampaignDates(job.aggregationRuleId)
    if (!ruleWithDates) {
      throw new Error(`Aggregation rule not found: ${job.aggregationRuleId}`)
    }

    const transformation = ruleWithDates.transformation as TransformationConfig | TransformationConfig[]
    const field = Array.isArray(transformation)
      ? transformation[0]?.field
      : transformation.field

    const rawValue = extractValueFromPayload(job.payload, field)
    const { transformedValue } = applyTransformationChain(rawValue, transformation)

    const eventTime = new Date(job.occurredAt)
    const window = calculateWindowBounds(
      ruleWithDates.windowType,
      eventTime,
      ruleWithDates.campaignStartsAt,
      ruleWithDates.campaignEndsAt,
      ruleWithDates.windowSizeHours,
    )

    const compositeMetricType = `${ruleWithDates.sourceEventType}_${ruleWithDates.metric}`

    const baseInput = {
      playerId: job.playerId,
      campaignId: job.campaignId,
      mechanicId: ruleWithDates.mechanicId,
      metricType: compositeMetricType,
      windowType: ruleWithDates.windowType as 'minute' | 'hourly' | 'daily' | 'weekly' | 'campaign' | 'rolling',
      windowStart: window.windowStart,
    }

    switch (ruleWithDates.metric) {
      case 'COUNT':
        await this.statsRepo.upsertCount(baseInput)
        break
      case 'SUM':
        await this.statsRepo.upsertSum({ ...baseInput, value: transformedValue })
        break
      case 'AVERAGE':
        await this.statsRepo.upsertAverage({
          ...baseInput,
          value: transformedValue,
          sampleCount: 1,
        })
        break
      default:
        throw new Error(`Unknown metric: ${ruleWithDates.metric}`)
    }

    // Realtime: stats changed, so any mounted widget should refresh.
    // - player-scope: progress bars, missions, reward lists for this player.
    // - campaign-scope leaderboard-changed: every viewer of this mechanic's
    //   leaderboard (if it is one — other widgets filter on mechanicId
    //   and ignore the ping).
    if (this.publisher) {
      await this.publisher.publishLeaderboardMovement(
        job.playerId,
        job.campaignId,
        ruleWithDates.mechanicId,
      )
    }
  }
}
