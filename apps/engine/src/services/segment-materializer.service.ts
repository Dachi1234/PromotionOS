import type { CampaignSchedulerRepository } from '../repositories/campaign.repository'
import type { ConditionNode } from '@promotionos/types'
import {
  evaluateConditionTree,
  type PlayerEvaluationContext,
} from './condition-evaluator.service'

export class SegmentMaterializerService {
  constructor(
    private readonly campaignRepo: CampaignSchedulerRepository,
  ) {}

  async materializeSegment(
    campaignId: string,
    segmentRuleConfig: unknown,
  ): Promise<string[]> {
    const conditionTree = segmentRuleConfig as ConditionNode
    const allPlayers = await this.campaignRepo.getAllPlayers()

    const matchingIds: string[] = []

    for (const player of allPlayers) {
      const context: PlayerEvaluationContext = {
        id: player.id,
        externalId: player.externalId,
        displayName: player.displayName,
        segmentTags: player.segmentTags ?? [],
        vipTier: player.vipTier,
        totalDepositsGel: parseFloat(player.totalDepositsGel ?? '0'),
        registrationDate: player.registrationDate,
      }

      const result = evaluateConditionTree(conditionTree, context)
      if (result.eligible) {
        matchingIds.push(player.id)
      }
    }

    return matchingIds
  }

  async materializeAndSnapshot(
    campaignId: string,
    segmentRuleConfig: unknown,
  ): Promise<string[]> {
    const playerIds = await this.materializeSegment(campaignId, segmentRuleConfig)
    await this.campaignRepo.upsertCampaignSegment(
      campaignId,
      playerIds,
      segmentRuleConfig,
    )
    return playerIds
  }
}
