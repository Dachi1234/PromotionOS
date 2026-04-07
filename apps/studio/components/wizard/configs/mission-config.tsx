'use client'

import { Plus, Trash2, GripVertical, HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'

interface MissionStep {
  id: string
  title: string
  description: string
  metricType: string
  targetValue: number
  timeLimitHours: number
}

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
}

export function MissionConfig({ mechanic, onUpdate }: Props) {
  const config = mechanic.config
  const steps: MissionStep[] = (config.steps as MissionStep[]) ?? []

  const addStep = () => {
    const newStep: MissionStep = {
      id: `step-${Date.now()}`,
      title: '',
      description: '',
      metricType: '',
      targetValue: 1,
      timeLimitHours: 24,
    }
    onUpdate({ steps: [...steps, newStep] })
  }

  const updateStep = (id: string, data: Partial<MissionStep>) => {
    onUpdate({ steps: steps.map((s) => (s.id === id ? { ...s, ...data } : s)) })
  }

  const removeStep = (id: string) => {
    onUpdate({ steps: steps.filter((s) => s.id !== id) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          Execution Mode
          <Tooltip content="Sequential = players must complete steps in order (Step 1 → Step 2 → Step 3). Parallel = players can work on all steps at the same time.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </h3>
        <div className="flex gap-3">
          {(['sequential', 'parallel'] as const).map((mode) => (
            <label key={mode} className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${config.executionMode === mode ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <input type="radio" className="sr-only" checked={config.executionMode === mode} onChange={() => onUpdate({ executionMode: mode })} />
              <span className="capitalize">{mode}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            Mission Steps ({steps.length})
            <Tooltip content="Each step is a challenge for the player. Define what they need to do (metric), how much (target), and how long they have (time limit).">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </h3>
          <button onClick={addStep} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Add mission steps to define player challenges
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground shrink-0">#{i + 1}</span>
                  <input type="text" value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} placeholder="Step title" className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm" />
                  <button onClick={() => removeStep(step.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input type="text" value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} placeholder="Description (optional)" className="h-8 w-full rounded border border-input bg-background px-2 text-xs" />
                  <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      Metric
                      <Tooltip content="The player action to track, like bet_count (number of bets) or total_bet_amount (total money wagered).">
                        <HelpCircle className="h-2.5 w-2.5 text-muted-foreground cursor-help" />
                      </Tooltip>
                    </label>
                    <input type="text" value={step.metricType} onChange={(e) => updateStep(step.id, { metricType: e.target.value })} placeholder="bet_count" className="h-8 w-full rounded border border-input bg-background px-2 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      Target
                      <Tooltip content="The goal value the player must reach. For example, '10' for bet_count means the player must place 10 bets.">
                        <HelpCircle className="h-2.5 w-2.5 text-muted-foreground cursor-help" />
                      </Tooltip>
                    </label>
                    <input type="number" value={step.targetValue} onChange={(e) => updateStep(step.id, { targetValue: Number(e.target.value) })} className="h-8 w-full rounded border border-input bg-background px-2 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      Time limit (hours)
                      <Tooltip content="How many hours the player has to complete this step. For example, 24 = one day.">
                        <HelpCircle className="h-2.5 w-2.5 text-muted-foreground cursor-help" />
                      </Tooltip>
                    </label>
                    <input type="number" value={step.timeLimitHours} onChange={(e) => updateStep(step.id, { timeLimitHours: Number(e.target.value) })} className="h-8 w-full rounded border border-input bg-background px-2 text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
