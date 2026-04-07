import type { Campaign, CampaignSegment } from '@promotionos/db'
import type { PlayerContext } from '../interfaces/player-context.interface'
import { evaluateConditionTree } from './condition-evaluator.service'
import type { PlayerEvaluationContext } from './condition-evaluator.service'
import type { ConditionNode } from '@promotionos/types'

export interface EligibilityResult {
  isEligible: boolean
  segmentIncluded: boolean
  failedConditions: string[]
}

export class EligibilityService {
  evaluate(
    player: PlayerContext,
    campaign: Campaign,
    segment: CampaignSegment | null,
  ): EligibilityResult {
    let segmentIncluded = true
    const failedConditions: string[] = []

    if (campaign.targetSegmentId && segment) {
      const playerIds = segment.playerIds ?? []
      segmentIncluded = playerIds.includes(player.id)
      if (!segmentIncluded) {
        failedConditions.push('Player not in target segment')
      }
    }

    if (segment?.segmentRuleConfig) {
      const conditionTree = segment.segmentRuleConfig as ConditionNode
      const evalCtx: PlayerEvaluationContext = {
        id: player.id,
        externalId: player.externalId,
        displayName: player.displayName,
        segmentTags: player.segmentTags,
        vipTier: player.vipTier,
        totalDepositsGel: player.totalDepositsGel,
        registrationDate: player.registrationDate,
      }
      const result = evaluateConditionTree(conditionTree, evalCtx)
      if (!result.eligible) {
        failedConditions.push(...(result.failedConditions ?? []))
      }
    }

    return {
      isEligible: segmentIncluded && failedConditions.length === 0,
      segmentIncluded,
      failedConditions,
    }
  }
}
