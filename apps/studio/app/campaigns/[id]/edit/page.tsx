'use client'

import { useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useWizardStore, type MechanicType, type WizardMechanic, type WizardAggregationRule, type WizardRewardDefinition } from '@/stores/wizard-store'
import { useCampaign } from '@/hooks/use-campaigns'
import { WizardShell } from '@/components/wizard/wizard-shell'

function toLocalDateTimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const MECHANIC_LABELS: Record<string, string> = {
  WHEEL: 'Wheel',
  WHEEL_IN_WHEEL: 'Wheel-in-Wheel',
  LEADERBOARD: 'Leaderboard',
  LEADERBOARD_LAYERED: 'Layered Leaderboard',
  MISSION: 'Mission',
  PROGRESS_BAR: 'Progress Bar',
  CASHOUT: 'Cashout',
  TOURNAMENT: 'Tournament',
}

function transformConfigFromEngine(type: string, config: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'WHEEL':
    case 'WHEEL_IN_WHEEL': {
      const visual = config.visual_config as Record<string, unknown> | undefined
      return {
        spinTrigger: config.spin_trigger ?? 'manual',
        maxSpinsPerDay: config.max_spins_per_day ?? null,
        maxSpinsPerCampaign: config.max_spins_campaign ?? null,
        maxSpinsTotal: config.max_spins_total ?? null,
        animationDuration: visual?.spin_duration_ms ?? 3000,
      }
    }
    case 'LEADERBOARD':
      return {
        rankingMetric: config.ranking_metric ?? 'BET_SUM',
        windowType: config.window_type ?? 'campaign',
        tieBreaker: config.tie_breaking ?? 'first_to_reach',
        secondaryMetric: config.secondary_metric ?? undefined,
        maxRanks: config.max_displayed_ranks ?? 100,
        prizeDistribution: config.prize_distribution ?? [],
      }
    case 'LEADERBOARD_LAYERED': {
      const lb1 = config.leaderboard_1 as Record<string, unknown> | undefined
      const lb2 = config.leaderboard_2 as Record<string, unknown> | undefined
      return {
        l1_rankingMetric: lb1?.ranking_metric ?? 'BET_SUM',
        l1_windowType: lb1?.window_type ?? 'campaign',
        l1_tieBreaker: lb1?.tie_breaking ?? 'first_to_reach',
        l1_maxRanks: lb1?.max_displayed_ranks ?? 100,
        l2_rankingMetric: lb2?.ranking_metric ?? 'BET_SUM',
        l2_windowType: lb2?.window_type ?? 'campaign',
        l2_tieBreaker: lb2?.tie_breaking ?? 'first_to_reach',
        l2_maxRanks: lb2?.max_displayed_ranks ?? 100,
        coinUnlockThreshold: config.unlock_threshold_coins ?? 100,
      }
    }
    case 'MISSION': {
      const rawSteps = Array.isArray(config.steps) ? config.steps as Record<string, unknown>[] : []
      return {
        executionMode: config.execution_mode ?? 'sequential',
        steps: rawSteps.map((s) => ({
          id: s.step_id,
          title: s.title,
          metricType: s.metric_type,
          targetValue: s.target_value,
          timeLimitHours: s.time_limit_hours,
          rewardDefinitionId: s.reward_definition_id,
        })),
      }
    }
    case 'PROGRESS_BAR':
      return {
        metricType: config.metric_type ?? 'BET_SUM',
        targetValue: config.target_value ?? 1000,
        rewardDefinitionId: config.reward_definition_id ?? undefined,
        autoGrant: config.auto_grant ?? false,
      }
    case 'CASHOUT':
      return {
        conditionTree: config.claim_conditions ?? { operator: 'AND', conditions: [] },
        rewardDefinitionId: config.reward_definition_id ?? undefined,
        maxClaims: config.max_claims_per_player ?? 1,
        cooldownHours: config.cooldown_hours ?? undefined,
      }
    default:
      return config
  }
}

interface EngineMechanic {
  id: string
  type: string
  config: Record<string, unknown>
  displayOrder: number
  isActive: boolean
}

interface EngineAggregationRule {
  id: string
  mechanicId: string
  sourceEventType: string
  metric: string
  transformation: { operation: string; parameter?: number }[]
  windowType: string
  windowSizeHours?: number | null
}

interface EngineRewardDefinition {
  id: string
  mechanicId: string
  type: string
  config: Record<string, unknown>
  probabilityWeight: string | null
  conditionConfig: Record<string, unknown> | null
}

function assembleWizardMechanics(
  engineMechanics: EngineMechanic[],
  engineAggRules: EngineAggregationRule[],
  engineRewards: EngineRewardDefinition[],
): WizardMechanic[] {
  return engineMechanics.map((m) => {
    const aggRules: WizardAggregationRule[] = engineAggRules
      .filter((r) => r.mechanicId === m.id)
      .map((r) => ({
        id: r.id,
        sourceEventType: r.sourceEventType,
        metric: r.metric as WizardAggregationRule['metric'],
        windowType: r.windowType,
        windowSizeHours: r.windowSizeHours ?? undefined,
        transformation: r.transformation ?? [{ operation: 'NONE' }],
      }))

    const rewards: WizardRewardDefinition[] = engineRewards
      .filter((r) => r.mechanicId === m.id)
      .map((r) => ({
        id: r.id,
        type: r.type,
        config: r.config ?? {},
        probabilityWeight: r.probabilityWeight != null ? Number(r.probabilityWeight) : undefined,
        conditionConfig: r.conditionConfig ?? null,
      }))

    return {
      id: m.id,
      type: m.type as MechanicType,
      label: MECHANIC_LABELS[m.type] ?? m.type,
      config: transformConfigFromEngine(m.type, m.config ?? {}),
      displayOrder: m.displayOrder,
      isActive: m.isActive,
      triggers: [],
      aggregationRules: aggRules,
      rewardDefinitions: rewards,
    }
  })
}

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading } = useCampaign(params.id)
  const hydrate = useWizardStore((s) => s.hydrate)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!data || hydrated.current) return
    hydrated.current = true

    const campaign = data.campaign as unknown as Record<string, unknown>
    const engineMechanics = (data.mechanics ?? []) as EngineMechanic[]
    const engineAggRules = (data.aggregationRules ?? []) as EngineAggregationRule[]
    const engineRewards = (data.rewardDefinitions ?? []) as EngineRewardDefinition[]

    const mechanics = assembleWizardMechanics(engineMechanics, engineAggRules, engineRewards)

    hydrate({
      campaignId: params.id,
      name: (campaign.name as string) ?? '',
      slug: (campaign.slug as string) ?? '',
      description: (campaign.description as string) ?? '',
      startsAt: campaign.startsAt ? toLocalDateTimeString(new Date(campaign.startsAt as string)) : '',
      endsAt: campaign.endsAt ? toLocalDateTimeString(new Date(campaign.endsAt as string)) : '',
      currency: (campaign.currency as string) ?? 'GEL',
      canvasConfig: (campaign.canvasConfig as Record<string, unknown>) ?? null,
      mechanics,
    })
  }, [data, params.id, hydrate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return <WizardShell />
}
