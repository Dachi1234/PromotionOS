import type { Mechanic, RawEvent } from '@promotionos/db'
import type { TriggerMatcherService } from './trigger-matcher.service'
import type { AggregationService } from './aggregation.service'
import type { MechanicRepository } from '../repositories/mechanic.repository'
import type { RawEventRepository } from '../repositories/raw-event.repository'
import type { ProgressBarService } from './mechanics/progress-bar.service'
import type { MissionService } from './mechanics/mission.service'
import type { ConditionProgressCheckerService } from './mechanics/condition-progress-checker.service'
import type { WheelService } from './mechanics/wheel.service'

export class EventPipelineService {
  constructor(
    private readonly triggerMatcher: TriggerMatcherService,
    private readonly aggregationService: AggregationService,
    private readonly mechanicRepo: MechanicRepository,
    private readonly rawEventRepo: RawEventRepository,
    private readonly progressBarService: ProgressBarService,
    private readonly missionService: MissionService,
    private readonly conditionCheckerService: ConditionProgressCheckerService,
    private readonly wheelService: WheelService | null,
  ) {}

  async processEvent(event: RawEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>

    // Use the event's occurredAt as the reference time for all window calculations.
    // This enables "time travel" testing — send events with past/future dates and
    // the entire pipeline (aggregation + evaluation) uses that time consistently.
    const referenceTime = event.occurredAt

    const matchedRules = await this.triggerMatcher.findMatchingRules(
      event.eventType,
      payload,
    )

    console.log(`[EventPipeline] Event ${event.eventType} for player ${event.playerId}: ${matchedRules.length} rule(s) matched (refTime=${referenceTime.toISOString()})`)

    if (matchedRules.length === 0) {
      await this.rawEventRepo.markProcessed(event.id)
      return
    }

    for (const match of matchedRules) {
      try {
        await this.aggregationService.processAggregationJob({
          rawEventId: event.id,
          playerId: event.playerId,
          campaignId: match.campaignId,
          aggregationRuleId: match.aggregationRule.id,
          eventType: event.eventType,
          payload,
          occurredAt: event.occurredAt.toISOString(),
        })
        console.log(`[EventPipeline] Aggregated rule ${match.aggregationRule.id} (${match.aggregationRule.sourceEventType}_${match.aggregationRule.metric})`)
      } catch (err) {
        console.error(`[EventPipeline] Aggregation failed for rule ${match.aggregationRule.id}:`, err)
      }
    }

    const processedCampaigns = new Set(matchedRules.map((m) => m.campaignId))
    for (const campaignId of processedCampaigns) {
      await this.evaluateCampaignMechanics(campaignId, event.playerId, payload, referenceTime)
    }

    await this.rawEventRepo.markProcessed(event.id)
  }

  private async evaluateCampaignMechanics(
    campaignId: string,
    playerId: string,
    _payload: Record<string, unknown>,
    referenceTime: Date,
  ): Promise<void> {
    const mechanics = await this.mechanicRepo.findByCampaignId(campaignId)

    for (const mechanic of mechanics) {
      if (!mechanic.isActive) continue
      try {
        await this.evaluateMechanic(mechanic, playerId, referenceTime)
        console.log(`[EventPipeline] Evaluated ${mechanic.type} (${mechanic.id})`)
      } catch (err) {
        console.error(`[EventPipeline] Mechanic eval failed for ${mechanic.type} ${mechanic.id}:`, err)
      }
    }
  }

  private async evaluateMechanic(mechanic: Mechanic, playerId: string, referenceTime: Date): Promise<void> {
    const config = mechanic.config as Record<string, unknown>

    switch (mechanic.type) {
      case 'PROGRESS_BAR':
        await this.progressBarService.evaluateAndAutoGrant(playerId, mechanic, referenceTime)
        break
      case 'MISSION':
        await this.missionService.evaluateProgress(playerId, mechanic, referenceTime)
        break
      case 'WHEEL_IN_WHEEL':
        await this.conditionCheckerService.checkForPlayer(playerId, mechanic.campaignId)
        break
      case 'WHEEL':
        if (config.spin_trigger === 'automatic' && this.wheelService) {
          try {
            await this.wheelService.spin(playerId, mechanic)
          } catch {
            // auto-spin may fail if limits reached — that's fine
          }
        }
        break
    }
  }
}
