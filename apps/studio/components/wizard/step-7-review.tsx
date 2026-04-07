'use client'

import { useMemo } from 'react'
import { Check, X, ArrowRight } from 'lucide-react'
import { useWizardStore } from '@/stores/wizard-store'

interface ChecklistItem {
  label: string
  passed: boolean
  step: number
}

function buildChecklist(store: ReturnType<typeof useWizardStore.getState>): ChecklistItem[] {
  const items: ChecklistItem[] = []

  items.push({ label: 'Campaign name is set', passed: !!store.name, step: 1 })
  items.push({ label: 'Slug is set', passed: !!store.slug, step: 1 })
  items.push({ label: 'Start date is set', passed: !!store.startsAt, step: 1 })
  items.push({ label: 'End date is after start date', passed: !!store.startsAt && !!store.endsAt && new Date(store.endsAt) > new Date(store.startsAt), step: 1 })
  items.push({ label: 'At least one mechanic configured', passed: store.mechanics.length > 0, step: 3 })

  for (const mech of store.mechanics) {
    if (mech.type === 'WHEEL' || mech.type === 'WHEEL_IN_WHEEL') {
      items.push({ label: `${mech.label}: at least 2 wheel slices`, passed: mech.rewardDefinitions.length >= 2, step: 5 })
      const totalWeight = mech.rewardDefinitions.reduce((s, r) => s + (r.probabilityWeight ?? 0), 0)
      items.push({ label: `${mech.label}: probability weights sum > 0`, passed: totalWeight > 0, step: 5 })
    }
    if (mech.type === 'MISSION') {
      items.push({ label: `${mech.label}: has at least one step`, passed: mech.rewardDefinitions.length > 0, step: 5 })
    }
    items.push({ label: `${mech.label}: has rewards`, passed: mech.rewardDefinitions.length > 0, step: 5 })
  }

  return items
}

export default function Step7Review() {
  const store = useWizardStore()
  const checklist = useMemo(() => buildChecklist(store), [store])
  const allPassed = checklist.every((item) => item.passed)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">Verify your campaign configuration before publishing</p>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="font-medium">Validation Checklist</h3>
        <div className="space-y-2">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {item.passed ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span className={item.passed ? 'text-foreground' : 'text-red-400'}>{item.label}</span>
              {!item.passed && (
                <button
                  onClick={() => store.setStep(item.step)}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Go to Step {item.step} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">Basics</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {store.name || '—'}</p>
            <p><span className="text-muted-foreground">Slug:</span> <span className="font-mono">{store.slug || '—'}</span></p>
            <p><span className="text-muted-foreground">Currency:</span> {store.currency}</p>
            <p><span className="text-muted-foreground">Dates:</span> {store.startsAt ? new Date(store.startsAt).toLocaleDateString() : '—'} → {store.endsAt ? new Date(store.endsAt).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">Targeting</h3>
          <p className="text-sm">{store.targetingMode === 'all' ? 'Open to all players' : 'Targeted segment configured'}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="font-medium">Mechanics ({store.mechanics.length})</h3>
        {store.mechanics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mechanics configured</p>
        ) : (
          <div className="grid gap-2">
            {store.mechanics.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-accent/50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{m.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{m.type}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.triggers.length} triggers · {m.aggregationRules.length} rules · {m.rewardDefinitions.length} rewards
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!allPassed && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400">
          Fix the issues above before scheduling or activating the campaign.
        </div>
      )}

      <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-400 space-y-1">
        <p className="font-medium">How publishing works:</p>
        <ul className="list-disc list-inside text-xs space-y-0.5">
          <li><strong>Schedule</strong> — saves the campaign as &quot;Scheduled&quot;. It will activate automatically when the start date arrives.</li>
          <li><strong>Activate Now</strong> — if the start date is in the future, the campaign is saved as &quot;Scheduled&quot; (auto-activates at start date). If the start date is in the past or now, it goes live immediately.</li>
          <li>All mechanics, rewards, and rules will be saved to the engine when you publish.</li>
        </ul>
      </div>
    </div>
  )
}
