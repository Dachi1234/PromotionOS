'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepper } from './wizard-stepper'
import { useWizardStore, type MechanicType } from '@/stores/wizard-store'
import { useCreateCampaign, useUpdateCampaign, useTransitionStatus } from '@/hooks/use-campaigns'
import { api } from '@/lib/api-client'
import { useSaveWizardDraft } from '@/hooks/use-wizard-drafts'
import { AppShell } from '@/components/layout/app-shell'

import Step1Basics from './step-1-basics'
import Step2Targeting from './step-2-targeting'
import Step3Mechanics from './step-3-mechanics'
import Step4Triggers from './step-4-triggers'
import Step5Rewards from './step-5-rewards'
import Step6Frontend from './step-6-frontend'
import Step7Review from './step-7-review'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

function transformConfigForEngine(type: MechanicType, config: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'WHEEL':
    case 'WHEEL_IN_WHEEL':
      return {
        spin_trigger: config.spinTrigger ?? 'manual',
        ...(config.maxSpinsPerDay != null ? { max_spins_per_day: Number(config.maxSpinsPerDay) } : {}),
        ...(config.maxSpinsPerCampaign != null ? { max_spins_campaign: Number(config.maxSpinsPerCampaign) } : {}),
        ...(config.maxSpinsTotal != null ? { max_spins_total: Number(config.maxSpinsTotal) } : {}),
        visual_config: {
          spin_duration_ms: Number(config.animationDuration ?? 3000),
        },
      }

    case 'LEADERBOARD':
      return {
        ranking_metric: config.rankingMetric || 'BET_SUM',
        window_type: config.windowType || 'campaign',
        tie_breaking: config.tieBreaker || 'first_to_reach',
        ...(config.secondaryMetric ? { secondary_metric: config.secondaryMetric } : {}),
        max_displayed_ranks: Number(config.maxRanks ?? 100),
        prize_distribution: Array.isArray(config.prizeDistribution) ? config.prizeDistribution : [],
      }

    case 'LEADERBOARD_LAYERED': {
      const transformLeaderboard = (prefix: string) => ({
        ranking_metric: config[`${prefix}rankingMetric`] || 'BET_SUM',
        window_type: config[`${prefix}windowType`] || 'campaign',
        tie_breaking: config[`${prefix}tieBreaker`] || 'first_to_reach',
        ...(config[`${prefix}secondaryMetric`] ? { secondary_metric: config[`${prefix}secondaryMetric`] } : {}),
        max_displayed_ranks: Number(config[`${prefix}maxRanks`] ?? 100),
        prize_distribution: [],
      })
      return {
        leaderboard_1: transformLeaderboard('l1_'),
        leaderboard_2: transformLeaderboard('l2_'),
        unlock_threshold_coins: Number(config.coinUnlockThreshold ?? 100),
        coin_award_mode: 'end_of_period',
      }
    }

    case 'MISSION': {
      const rawSteps = Array.isArray(config.steps) ? config.steps as Record<string, unknown>[] : []
      return {
        execution_mode: config.executionMode || 'sequential',
        steps: rawSteps.length > 0
          ? rawSteps.map((s, i) => ({
              step_id: s.id ?? NIL_UUID,
              order: i + 1,
              title: s.title || `Step ${i + 1}`,
              metric_type: s.metricType || 'BET_COUNT',
              target_value: Number(s.targetValue ?? 1),
              time_limit_hours: Number(s.timeLimitHours ?? 24),
              reward_definition_id: (s.rewardDefinitionId as string) || NIL_UUID,
            }))
          : [{
              step_id: NIL_UUID,
              order: 1,
              title: 'Step 1',
              metric_type: 'BET_COUNT',
              target_value: 1,
              time_limit_hours: 24,
              reward_definition_id: NIL_UUID,
            }],
      }
    }

    case 'PROGRESS_BAR':
      return {
        metric_type: config.metricType || 'BET_SUM',
        target_value: Number(config.targetValue ?? 1000),
        reward_definition_id: (config.rewardDefinitionId as string) || NIL_UUID,
        auto_grant: config.autoGrant === true,
        window_type: config.windowType || 'campaign',
      }

    case 'CASHOUT': {
      const tree = config.conditionTree as Record<string, unknown> | undefined
      return {
        claim_conditions: tree?.operator
          ? tree
          : { operator: 'AND', conditions: [{ type: 'MIN_BET_AMOUNT', value: 0 }] },
        reward_definition_id: (config.rewardDefinitionId as string) || NIL_UUID,
        max_claims_per_player: Number(config.maxClaims ?? 1),
        ...(config.cooldownHours != null ? { cooldown_hours: Number(config.cooldownHours) } : {}),
      }
    }

    default:
      return config
  }
}

export function WizardShell() {
  const store = useWizardStore()
  const router = useRouter()
  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()
  const transitionStatus = useTransitionStatus()
  const [saving, setSaving] = useState(false)

  const completedSteps = useMemo(() => {
    const completed: number[] = []
    if (store.name && store.slug && store.startsAt && store.endsAt) completed.push(1)
    completed.push(2) // targeting is always valid (can be "all")
    if (store.mechanics.length > 0) completed.push(3)
    if (store.mechanics.length > 0) completed.push(4) // triggers optional for now
    if (store.mechanics.length > 0) completed.push(5) // rewards optional for now
    completed.push(6) // frontend is optional
    return completed
  }, [store.name, store.slug, store.startsAt, store.endsAt, store.mechanics.length])

  const saveDraftMutation = useSaveWizardDraft()

  const saveDraft = useCallback(async () => {
    setSaving(true)
    try {
      const stepData = {
        name: store.name,
        slug: store.slug,
        description: store.description,
        startsAt: store.startsAt,
        endsAt: store.endsAt,
        currency: store.currency,
        targetingMode: store.targetingMode,
        conditionTree: store.conditionTree,
        mechanics: store.mechanics,
        dependencies: store.dependencies,
        canvasConfig: store.canvasConfig,
        currentStep: store.currentStep,
      }
      const draft = await saveDraftMutation.mutateAsync({
        draftId: store.draftId,
        campaignId: store.campaignId,
        stepData,
      })
      useWizardStore.setState({ draftId: draft.id })
      store.markSaved()
    } catch (err) {
      console.error('Failed to save draft:', err)
    } finally {
      setSaving(false)
    }
  }, [store, saveDraftMutation])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!store.isDirty) return
    const timer = setInterval(() => {
      if (store.isDirty) saveDraft()
    }, 30_000)
    return () => clearInterval(timer)
  }, [store.isDirty, saveDraft])

  const [canvasSavePromise, setCanvasSavePromise] = useState<{
    resolve: () => void
    reject: () => void
  } | null>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'CANVAS_SAVED' && canvasSavePromise) {
        canvasSavePromise.resolve()
        setCanvasSavePromise(null)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [canvasSavePromise])

  const ensureCampaignCreated = async (): Promise<string | null> => {
    if (store.campaignId) return store.campaignId
    if (!store.name || !store.slug || !store.startsAt || !store.endsAt) return null
    try {
      const campaign = await createCampaign.mutateAsync({
        name: store.name,
        slug: store.slug,
        description: store.description,
        startsAt: new Date(store.startsAt).toISOString(),
        endsAt: new Date(store.endsAt).toISOString(),
        currency: store.currency,
      })
      useWizardStore.setState({ campaignId: campaign.id })
      return campaign.id
    } catch {
      return null
    }
  }

  const handleNext = async () => {
    if (store.currentStep >= 7) return

    if (store.currentStep === 5) {
      const id = store.campaignId ?? await ensureCampaignCreated()
      if (!id) {
        alert('Please fill in Step 1 (name, slug, dates) before proceeding to the page builder.')
        return
      }
      try {
        await syncMechanicsToEngine(id)
      } catch {
        // Non-blocking: sync errors are shown in the banner but don't prevent navigation
      }
    }

    if (store.currentStep === 6) {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[src*="/builder/"]')
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'STUDIO_SAVE_REQUEST' }, '*')
        try {
          await new Promise<void>((resolve, reject) => {
            setCanvasSavePromise({ resolve, reject })
            setTimeout(() => reject(), 10_000)
          })
        } catch {
          /* timeout or error — proceed anyway */
        }
      }
    }

    store.setStep(store.currentStep + 1)
  }

  const handleBack = () => {
    if (store.currentStep > 1) store.setStep(store.currentStep - 1)
  }

  const [syncError, setSyncError] = useState<string | null>(null)

  function transformRewardConfig(type: string, config: Record<string, unknown>): Record<string, unknown> {
    switch (type) {
      case 'FREE_SPINS':
      case 'EXTRA_SPIN':
        return {
          count: config.spins ?? config.count ?? 1,
          ...(config.target_mechanic_id || config.targetMechanicId
            ? { target_mechanic_id: config.target_mechanic_id ?? config.targetMechanicId }
            : {}),
        }
      case 'VIRTUAL_COINS':
        return { amount: config.coins ?? config.amount ?? 0 }
      case 'CASH':
      case 'FREE_BET':
        return { amount: config.amount ?? 0 }
      case 'CASHBACK':
        return { percentage: config.percentage ?? 0, cap: config.cap ?? 0 }
      case 'MULTIPLIER':
        return { multiplier: config.multiplier ?? 1 }
      case 'PHYSICAL':
        return { description: config.description ?? '' }
      default:
        return config
    }
  }

  function transformConditionConfig(cc: Record<string, unknown>): Record<string, unknown> {
    return {
      condition_type: cc.conditionType ?? cc.condition_type,
      target_value: cc.targetValue ?? cc.target_value,
      time_limit_hours: cc.timeLimitHours ?? cc.time_limit_hours,
      on_failure: cc.onFailure ?? cc.on_failure ?? 'expire',
    }
  }

  const syncMechanicsToEngine = async (campaignId: string) => {
    const existingMechs = await api.get<{ mechanics: { id: string; type: string }[] }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`)
    const existingIds = new Set((existingMechs.data?.mechanics ?? []).map((m) => m.id))
    const errors: string[] = []

    for (const mech of store.mechanics) {
      // Auto-inject aggregation rules implied by mechanic config
      const effectiveAggRules = [...mech.aggregationRules]
      const autoInjectMetricKey = (metricKey: string, windowType: string) => {
        const parts = metricKey.split('_')
        if (parts.length < 2) return
        const metric = parts[parts.length - 1]
        const sourceEventType = parts.slice(0, -1).join('_')
        const alreadyHas = effectiveAggRules.some(
          (r) => r.sourceEventType === sourceEventType && r.metric === metric,
        )
        if (!alreadyHas) {
          effectiveAggRules.push({
            id: `auto-${sourceEventType}-${metric}`,
            sourceEventType,
            metric: metric as 'COUNT' | 'SUM' | 'AVERAGE',
            windowType,
            transformation: [{ operation: 'NONE', field: 'amount' }],
          } as typeof effectiveAggRules[number])
        }
      }
      if (mech.type === 'LEADERBOARD' || mech.type === 'LEADERBOARD_LAYERED') {
        if (mech.config.rankingMetric) {
          autoInjectMetricKey(String(mech.config.rankingMetric), String(mech.config.windowType || 'campaign'))
        }
      }
      if (mech.type === 'PROGRESS_BAR') {
        if (mech.config.metricType) {
          autoInjectMetricKey(String(mech.config.metricType), String(mech.config.windowType || 'campaign'))
        }
      }

      const mechConfig = { ...mech.config }
      if (mech.type === 'PROGRESS_BAR' && mech.aggregationRules.length > 0) {
        mechConfig.windowType = mechConfig.windowType || mech.aggregationRules[0].windowType || 'campaign'
      }
      const engineConfig = transformConfigForEngine(mech.type, mechConfig)

      if (existingIds.has(mech.id)) {
        try {
          await api.put(`/api/v1/admin/mechanics/${mech.id}`, {
            config: engineConfig,
            displayOrder: mech.displayOrder,
            isActive: mech.isActive,
          })

          const existingRewards = await api.get<{ rewardDefinitions: { id: string }[] }>(
            `/api/v1/admin/mechanics/${mech.id}/reward-definitions`,
          ).catch(() => ({ data: { rewardDefinitions: [] } }))
          const existingRewardIds = new Set((existingRewards.data?.rewardDefinitions ?? []).map((r) => r.id))

          const rewardIdMapForExisting: Record<string, string> = {}
          for (const reward of mech.rewardDefinitions) {
            const engineRewardConfig = transformRewardConfig(reward.type, reward.config || {})
            const engineConditionConfig = reward.conditionConfig
              ? transformConditionConfig(reward.conditionConfig as Record<string, unknown>)
              : null
            if (existingRewardIds.has(reward.id)) {
              await api.put(`/api/v1/admin/reward-definitions/${reward.id}`, {
                type: reward.type || 'FREE_SPINS',
                config: engineRewardConfig,
                probabilityWeight: reward.probabilityWeight ?? 1,
                conditionConfig: engineConditionConfig,
              }).catch(() => {})
            } else {
              const res = await api.post<{ id: string }>(`/api/v1/admin/mechanics/${mech.id}/reward-definitions`, {
                type: reward.type || 'FREE_SPINS',
                config: engineRewardConfig,
                probabilityWeight: reward.probabilityWeight ?? 1,
                conditionConfig: engineConditionConfig,
              }).catch(() => null)
              if (res?.data?.id) {
                rewardIdMapForExisting[reward.id] = res.data.id
              }
            }
          }
          // Save new reward IDs back to store to prevent duplication on re-sync
          if (Object.keys(rewardIdMapForExisting).length > 0) {
            useWizardStore.setState((s) => ({
              mechanics: s.mechanics.map((m) =>
                m.id === mech.id
                  ? {
                      ...m,
                      rewardDefinitions: m.rewardDefinitions.map((r) =>
                        rewardIdMapForExisting[r.id] ? { ...r, id: rewardIdMapForExisting[r.id] } : r,
                      ),
                    }
                  : m,
              ),
            }))
          }

          // Wire reward IDs into mechanic config (e.g., progress bar reward_definition_id)
          if (needsRewardWiring(mech.type)) {
            const allRewardIds = mech.rewardDefinitions.map((r) => rewardIdMapForExisting[r.id] ?? r.id)
            if (allRewardIds.length > 0 && allRewardIds[0] !== NIL_UUID) {
              const patchedConfig = wireRewardIds(mech.type, engineConfig, allRewardIds)
              await api.put(`/api/v1/admin/mechanics/${mech.id}`, { config: patchedConfig }).catch(() => {})
            }
          }

          // Sync aggregation rules for existing mechanics
          const campaignDetail = await api.get<{ aggregationRules: { id: string; mechanicId: string; sourceEventType: string; metric: string }[] }>(
            `/api/v1/admin/campaigns/${campaignId}`,
          ).catch(() => ({ data: { aggregationRules: [] } }))
          const existingRuleKeys = new Set(
            (campaignDetail.data?.aggregationRules ?? [])
              .filter((r) => r.mechanicId === mech.id)
              .map((r) => `${r.sourceEventType}_${r.metric}`),
          )

          for (const rule of effectiveAggRules) {
            const ruleKey = `${rule.sourceEventType || 'BET'}_${rule.metric || 'COUNT'}`
            if (existingRuleKeys.has(ruleKey)) continue

            try {
              const engineTransformation = (rule.transformation || [{ operation: 'NONE' }]).map(
                (step: Record<string, unknown>) => {
                  const mapped: Record<string, unknown> = { operation: step.operation, field: step.field }
                  if (step.operation === 'MULTIPLY' || step.operation === 'PERCENTAGE') {
                    mapped.factor = step.parameter ?? step.factor ?? 1
                  } else if (step.operation === 'CAP') {
                    mapped.cap = step.parameter ?? step.cap ?? Infinity
                  }
                  return mapped
                },
              )
              const aggPayload: Record<string, unknown> = {
                mechanicId: mech.id,
                sourceEventType: rule.sourceEventType || 'BET',
                metric: rule.metric || 'COUNT',
                transformation: engineTransformation,
                windowType: rule.windowType || 'campaign',
              }
              if (rule.windowSizeHours != null && rule.windowSizeHours > 0) {
                aggPayload.windowSizeHours = rule.windowSizeHours
              }
              await api.post(`/api/v1/admin/campaigns/${campaignId}/aggregation-rules`, aggPayload)
            } catch (ruleErr) {
              const msg = ruleErr instanceof Error ? ruleErr.message : 'Unknown error'
              errors.push(`${mech.label} aggregation rule: ${msg}`)
            }
          }
        } catch (updateErr) {
          const msg = updateErr instanceof Error ? updateErr.message : 'Unknown error'
          errors.push(`${mech.label} update: ${msg}`)
        }
        continue
      }

      try {
        const created = await api.post<{ id: string }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`, {
          type: mech.type,
          config: engineConfig,
          displayOrder: mech.displayOrder,
          isActive: mech.isActive,
        })

        const engineMechanicId = created.data?.id
        if (!engineMechanicId) {
          errors.push(`${mech.label}: no ID returned from engine`)
          continue
        }

        const oldMechId = mech.id
        useWizardStore.setState((s) => ({
          mechanics: s.mechanics.map((m) => {
            // Update the mechanic's own ID
            const updated = m.id === oldMechId ? { ...m, id: engineMechanicId } : m
            // Also update targetMechanicId in reward configs that reference this mechanic
            return {
              ...updated,
              rewardDefinitions: updated.rewardDefinitions.map((r) => {
                const cfg = r.config as Record<string, unknown>
                if (cfg.targetMechanicId === oldMechId) {
                  return { ...r, config: { ...cfg, targetMechanicId: engineMechanicId } }
                }
                return r
              }),
            }
          }),
          // Also update dependency references so they point to engine IDs
          dependencies: s.dependencies.map((d) => ({
            ...d,
            parentMechanicId: d.parentMechanicId === oldMechId ? engineMechanicId : d.parentMechanicId,
            childMechanicId: d.childMechanicId === oldMechId ? engineMechanicId : d.childMechanicId,
          })),
        }))

        const createdRewardIds: string[] = []
        const rewardIdMap: Record<string, string> = {} // tempId -> engineId
        for (const reward of mech.rewardDefinitions) {
          try {
            const engineRewardConfig = transformRewardConfig(reward.type, reward.config || {})
            const engineConditionConfig = reward.conditionConfig
              ? transformConditionConfig(reward.conditionConfig as Record<string, unknown>)
              : null
            const rewardRes = await api.post<{ id: string }>(`/api/v1/admin/mechanics/${engineMechanicId}/reward-definitions`, {
              type: reward.type || 'FREE_SPINS',
              config: engineRewardConfig,
              probabilityWeight: reward.probabilityWeight ?? 1,
              conditionConfig: engineConditionConfig,
            })
            if (rewardRes.data?.id) {
              createdRewardIds.push(rewardRes.data.id)
              rewardIdMap[reward.id] = rewardRes.data.id
            }
          } catch (rewardErr) {
            const msg = rewardErr instanceof Error ? rewardErr.message : 'Unknown error'
            errors.push(`${mech.label} reward: ${msg}`)
          }
        }

        // Update reward IDs in store so re-syncs don't duplicate
        if (Object.keys(rewardIdMap).length > 0) {
          useWizardStore.setState((s) => ({
            mechanics: s.mechanics.map((m) =>
              m.id === engineMechanicId
                ? {
                    ...m,
                    rewardDefinitions: m.rewardDefinitions.map((r) =>
                      rewardIdMap[r.id] ? { ...r, id: rewardIdMap[r.id] } : r,
                    ),
                  }
                : m,
            ),
          }))
        }

        if (createdRewardIds.length > 0 && needsRewardWiring(mech.type)) {
          const patchedConfig = wireRewardIds(mech.type, engineConfig, createdRewardIds)
          await api.put(`/api/v1/admin/mechanics/${engineMechanicId}`, { config: patchedConfig })
        }

        for (const rule of effectiveAggRules) {
          try {
            const engineTransformation = (rule.transformation || [{ operation: 'NONE' }]).map(
              (step: Record<string, unknown>) => {
                const mapped: Record<string, unknown> = { operation: step.operation, field: step.field }
                if (step.operation === 'MULTIPLY' || step.operation === 'PERCENTAGE') {
                  mapped.factor = step.parameter ?? step.factor ?? 1
                } else if (step.operation === 'CAP') {
                  mapped.cap = step.parameter ?? step.cap ?? Infinity
                }
                return mapped
              },
            )
            const aggPayload: Record<string, unknown> = {
              mechanicId: engineMechanicId,
              sourceEventType: rule.sourceEventType || 'BET',
              metric: rule.metric || 'COUNT',
              transformation: engineTransformation,
              windowType: rule.windowType || 'campaign',
            }
            if (rule.windowSizeHours != null && rule.windowSizeHours > 0) {
              aggPayload.windowSizeHours = rule.windowSizeHours
            }
            await api.post(`/api/v1/admin/campaigns/${campaignId}/aggregation-rules`, aggPayload)
          } catch (ruleErr) {
            const msg = ruleErr instanceof Error ? ruleErr.message : 'Unknown error'
            errors.push(`${mech.label} aggregation rule: ${msg}`)
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${mech.label}: ${msg}`)
      }
    }

    // Auto-create dependencies from EXTRA_SPIN reward targeting
    // If mechanic A has an EXTRA_SPIN reward pointing to wheel B, then B depends on A
    // (wheel can only spin after progress/mission is complete)
    const currentMechanics = useWizardStore.getState().mechanics
    const autoDeps: Array<{ parentId: string; childId: string }> = []
    for (const mech of currentMechanics) {
      for (const reward of mech.rewardDefinitions) {
        if (reward.type === 'EXTRA_SPIN') {
          const targetId = (reward.config as Record<string, unknown>).targetMechanicId as string | undefined
          if (targetId && targetId !== mech.id) {
            autoDeps.push({ parentId: mech.id, childId: targetId })
          }
        }
      }
    }

    // Sync dependencies: combine manual (from store) + auto-detected
    // Deduplicate by (child, parent) pair
    const allDepsToSync = new Map<string, { childId: string; parentId: string; unlockCondition: Record<string, unknown> }>()

    // Add manual deps from store
    for (const dep of useWizardStore.getState().dependencies) {
      const key = `${dep.childMechanicId}:${dep.parentMechanicId}`
      allDepsToSync.set(key, {
        childId: dep.childMechanicId,
        parentId: dep.parentMechanicId,
        unlockCondition: dep.unlockCondition || { type: 'mechanic_complete' },
      })
    }

    // Add auto deps (won't overwrite manual ones with same key)
    for (const ad of autoDeps) {
      const key = `${ad.childId}:${ad.parentId}`
      if (!allDepsToSync.has(key)) {
        allDepsToSync.set(key, {
          childId: ad.childId,
          parentId: ad.parentId,
          unlockCondition: { type: 'mechanic_complete' },
        })
      }
    }

    // Fetch existing dependencies from engine to avoid duplicates
    const existingEngineDeps = new Set<string>()
    for (const mech of currentMechanics) {
      try {
        const res = await api.get<{ dependencies: { mechanic_id: string; depends_on_mechanic_id: string }[] }>(
          `/api/v1/admin/mechanics/${mech.id}/dependencies`,
        )
        for (const d of res.data?.dependencies ?? []) {
          existingEngineDeps.add(`${d.mechanic_id}:${d.depends_on_mechanic_id}`)
        }
      } catch { /* ignore */ }
    }

    for (const [key, dep] of Array.from(allDepsToSync.entries())) {
      if (existingEngineDeps.has(key)) continue // Already exists in engine
      try {
        await api.post(`/api/v1/admin/mechanics/${dep.childId}/dependencies`, {
          dependsOnMechanicId: dep.parentId,
          unlockCondition: dep.unlockCondition,
        })
      } catch {
        // Non-critical: dependency sync failure
      }
    }

    if (errors.length > 0) {
      const errorMsg = `Some mechanics failed to sync:\n${errors.join('\n')}`
      setSyncError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  function needsRewardWiring(type: MechanicType): boolean {
    return ['PROGRESS_BAR', 'CASHOUT', 'MISSION'].includes(type)
  }

  function wireRewardIds(type: MechanicType, config: Record<string, unknown>, rewardIds: string[]): Record<string, unknown> {
    const firstRewardId = rewardIds[0] ?? NIL_UUID
    switch (type) {
      case 'PROGRESS_BAR':
        return { ...config, reward_definition_id: firstRewardId }
      case 'CASHOUT':
        return { ...config, reward_definition_id: firstRewardId }
      case 'MISSION': {
        const steps = (config.steps ?? []) as Record<string, unknown>[]
        return {
          ...config,
          steps: steps.map((s, i) => ({
            ...s,
            reward_definition_id: rewardIds[i] ?? rewardIds[0] ?? NIL_UUID,
          })),
        }
      }
      default:
        return config
    }
  }

  const handlePublish = async (targetStatus: string) => {
    setSaving(true)
    setSyncError(null)
    try {
      const campaignData = {
        name: store.name,
        slug: store.slug,
        description: store.description,
        startsAt: new Date(store.startsAt).toISOString(),
        endsAt: new Date(store.endsAt).toISOString(),
        currency: store.currency,
      }

      let campaignId = store.campaignId
      if (campaignId) {
        await updateCampaign.mutateAsync({ id: campaignId, data: campaignData })
      } else {
        const campaign = await createCampaign.mutateAsync(campaignData)
        campaignId = campaign.id
        useWizardStore.setState({ campaignId })
      }

      await syncMechanicsToEngine(campaignId)
      await transitionStatus.mutateAsync({ id: campaignId, status: targetStatus })
      router.push(`/campaigns/${campaignId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish campaign'
      setSyncError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSchedule = () => handlePublish('scheduled')
  const handleActivate = () => handlePublish('active')

  const stepComponent = (() => {
    switch (store.currentStep) {
      case 1: return <Step1Basics />
      case 2: return <Step2Targeting />
      case 3: return <Step3Mechanics />
      case 4: return <Step4Triggers />
      case 5: return <Step5Rewards />
      case 6: return <Step6Frontend />
      case 7: return <Step7Review />
      default: return null
    }
  })()

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {store.campaignId ? 'Edit Campaign' : 'Create Campaign'}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            {store.isDirty ? (
              <span className="text-amber-400">Unsaved changes</span>
            ) : store.lastSavedAt ? (
              <span className="text-muted-foreground">Draft saved</span>
            ) : null}
          </div>
        </div>

        <WizardStepper
          currentStep={store.currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => store.setStep(step)}
        />

        {syncError && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm">
            <p className="font-medium text-red-400">Publishing failed</p>
            <pre className="mt-1 text-xs text-red-300/80 whitespace-pre-wrap">{syncError}</pre>
            <button onClick={() => setSyncError(null)} className="mt-2 text-xs text-red-400 underline">Dismiss</button>
          </div>
        )}

        <div className="min-h-[400px]">
          {stepComponent}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={handleBack}
            disabled={store.currentStep === 1}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {store.currentStep < 7 ? (
              <button
                onClick={handleNext}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Next
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSchedule}
                  className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  Schedule
                </button>
                <button
                  onClick={handleActivate}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Activate Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
