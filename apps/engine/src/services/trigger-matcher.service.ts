import type { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import type { AggregationRuleRepository } from '../repositories/aggregation-rule.repository'
import type { Campaign, AggregationRule } from '@promotionos/db'
import type { TriggerFilter } from '@promotionos/types'

export interface MatchedRule {
  campaignId: string
  aggregationRule: AggregationRule
}

export class TriggerMatcherService {
  constructor(
    private readonly campaignRepo: CampaignSchedulerRepository,
    private readonly aggRuleRepo: AggregationRuleRepository,
  ) {}

  async findMatchingRules(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<MatchedRule[]> {
    const activeCampaigns = await this.campaignRepo.findActiveCampaigns()
    const matched: MatchedRule[] = []

    for (const campaign of activeCampaigns) {
      if (!this.matchesCampaignTrigger(campaign, eventType, payload)) {
        continue
      }

      const rules = await this.aggRuleRepo.findByCampaignAndEventType(
        campaign.id,
        eventType as AggregationRule['sourceEventType'],
      )

      for (const rule of rules) {
        matched.push({ campaignId: campaign.id, aggregationRule: rule })
      }
    }

    return matched
  }

  private matchesCampaignTrigger(
    campaign: Campaign,
    eventType: string,
    payload: Record<string, unknown>,
  ): boolean {
    const triggerConfig = campaign.canvasConfig as { trigger?: { eventType?: string; filters?: TriggerFilter } } | null

    if (!triggerConfig?.trigger) return true

    if (triggerConfig.trigger.eventType && triggerConfig.trigger.eventType !== eventType) {
      return false
    }

    if (triggerConfig.trigger.filters) {
      return this.matchesFilters(triggerConfig.trigger.filters, payload)
    }

    return true
  }

  private matchesFilters(
    filters: TriggerFilter,
    payload: Record<string, unknown>,
  ): boolean {
    if (filters.minAmount !== undefined) {
      const amount = Number(payload['amount'] ?? 0)
      if (amount < filters.minAmount) return false
    }

    if (filters.gameCategory) {
      if (payload['game_category'] !== filters.gameCategory && payload['gameCategory'] !== filters.gameCategory) {
        return false
      }
    }

    if (filters.gameId) {
      if (payload['game_id'] !== filters.gameId && payload['gameId'] !== filters.gameId) {
        return false
      }
    }

    return true
  }
}
