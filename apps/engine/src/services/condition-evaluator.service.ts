import type { ConditionNode, ConditionEvaluationResult } from '@promotionos/types'

export interface PlayerEvaluationContext {
  id: string
  externalId: string
  displayName: string
  segmentTags: string[]
  vipTier: string
  totalDepositsGel: number
  registrationDate: Date
}

export interface StatsContext {
  [metricType: string]: number
}

function daysSince(date: Date): number {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function evaluateLeaf(
  node: { type: string; value: unknown },
  player: PlayerEvaluationContext,
  stats?: StatsContext,
): { pass: boolean; reason?: string } {
  switch (node.type) {
    case 'MIN_DEPOSIT_GEL': {
      const threshold = Number(node.value)
      if (player.totalDepositsGel >= threshold) return { pass: true }
      return { pass: false, reason: `MIN_DEPOSIT_GEL: ${player.totalDepositsGel} < ${threshold}` }
    }

    case 'VIP_TIER': {
      const tiers = ['bronze', 'silver', 'gold', 'platinum']
      const required = String(node.value).toLowerCase()
      const playerIdx = tiers.indexOf(player.vipTier.toLowerCase())
      const requiredIdx = tiers.indexOf(required)
      if (playerIdx >= requiredIdx) return { pass: true }
      return { pass: false, reason: `VIP_TIER: ${player.vipTier} < ${required}` }
    }

    case 'SEGMENT_TAG': {
      const tag = String(node.value)
      if (player.segmentTags.includes(tag)) return { pass: true }
      return { pass: false, reason: `SEGMENT_TAG: missing "${tag}"` }
    }

    case 'REGISTRATION_AGE': {
      const minDays = Number(node.value)
      const age = daysSince(player.registrationDate)
      if (age >= minDays) return { pass: true }
      return { pass: false, reason: `REGISTRATION_AGE: ${age} days < ${minDays}` }
    }

    case 'GAME_CATEGORY':
      return { pass: true }

    case 'MIN_BET_AMOUNT': {
      const threshold = Number(node.value)
      const current = stats?.['bet_amount'] ?? stats?.['SUM'] ?? 0
      if (current >= threshold) return { pass: true }
      return { pass: false, reason: `MIN_BET_AMOUNT: ${current} < ${threshold}` }
    }

    case 'MIN_DEPOSIT_COUNT': {
      const threshold = Number(node.value)
      const current = stats?.['deposit_count'] ?? stats?.['COUNT'] ?? 0
      if (current >= threshold) return { pass: true }
      return { pass: false, reason: `MIN_DEPOSIT_COUNT: ${current} < ${threshold}` }
    }

    case 'MIN_BET_COUNT': {
      const threshold = Number(node.value)
      const current = stats?.['bet_count'] ?? stats?.['COUNT'] ?? 0
      if (current >= threshold) return { pass: true }
      return { pass: false, reason: `MIN_BET_COUNT: ${current} < ${threshold}` }
    }

    default:
      return { pass: false, reason: `Unknown condition type: ${node.type}` }
  }
}

export function evaluateConditionTree(
  node: ConditionNode,
  player: PlayerEvaluationContext,
  stats?: StatsContext,
): ConditionEvaluationResult {
  if ('operator' in node && node.operator) {
    const results = node.conditions.map((child) =>
      evaluateConditionTree(child, player, stats),
    )

    if (node.operator === 'AND') {
      const failed = results.flatMap((r) => r.failedConditions ?? [])
      const eligible = results.every((r) => r.eligible)
      return { eligible, failedConditions: failed.length > 0 ? failed : undefined }
    }

    const anyPass = results.some((r) => r.eligible)
    if (anyPass) return { eligible: true }
    const failed = results.flatMap((r) => r.failedConditions ?? [])
    return { eligible: false, failedConditions: failed }
  }

  if ('type' in node && node.type) {
    const result = evaluateLeaf(
      { type: node.type, value: node.value },
      player,
      stats,
    )
    return {
      eligible: result.pass,
      failedConditions: result.reason ? [result.reason] : undefined,
    }
  }

  return { eligible: false, failedConditions: ['Invalid condition node'] }
}
