'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepper } from './wizard-stepper'
import { useWizardStore } from '@/stores/wizard-store'
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

    if (store.currentStep === 5 && !store.campaignId) {
      const id = await ensureCampaignCreated()
      if (!id) {
        alert('Please fill in Step 1 (name, slug, dates) before proceeding to the page builder.')
        return
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

  const syncMechanicsToEngine = async (campaignId: string) => {
    const existingMechs = await api.get<{ mechanics: { id: string; type: string }[] }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`)
    const existingIds = new Set((existingMechs.data?.mechanics ?? []).map((m) => m.id))

    for (const mech of store.mechanics) {
      if (existingIds.has(mech.id)) continue
      try {
        const created = await api.post<{ id: string }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`, {
          type: mech.type,
          config: mech.config,
          displayOrder: mech.displayOrder,
          isActive: mech.isActive,
        })

        const engineMechanicId = created.data?.id
        if (!engineMechanicId) continue

        for (const reward of mech.rewardDefinitions) {
          await api.post(`/api/v1/admin/mechanics/${engineMechanicId}/reward-definitions`, {
            type: reward.type || 'FIXED_AMOUNT',
            config: reward.config || {},
            probabilityWeight: reward.probabilityWeight ?? 1,
            conditionConfig: reward.conditionConfig ?? null,
          })
        }

        for (const rule of mech.aggregationRules) {
          await api.post(`/api/v1/admin/campaigns/${campaignId}/aggregation-rules`, {
            mechanicId: engineMechanicId,
            sourceEventType: rule.sourceEventType || 'BET',
            metric: rule.metric || 'amount',
            transformation: rule.transformation || [{ operation: 'SUM' }],
            windowType: rule.windowType || 'CAMPAIGN_LIFETIME',
            windowSizeHours: rule.windowSizeHours ?? null,
          })
        }
      } catch (err) {
        console.error(`Failed to sync mechanic ${mech.label}:`, err)
      }
    }
  }

  const handlePublish = async (targetStatus: string) => {
    setSaving(true)
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
      console.error('Failed to publish:', err)
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
