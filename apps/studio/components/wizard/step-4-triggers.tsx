'use client'

import { Plus, Trash2, ChevronDown, ChevronRight, ArrowRight, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { useWizardStore, type WizardMechanic, type WizardTrigger, type WizardAggregationRule } from '@/stores/wizard-store'

const EVENT_TYPES = ['BET', 'DEPOSIT', 'REFERRAL', 'LOGIN', 'OPT_IN', 'FREE_SPIN_USED', 'MANUAL', 'MECHANIC_OUTCOME']
const METRICS = ['COUNT', 'SUM', 'AVERAGE']
const WINDOWS = ['minute', 'hourly', 'daily', 'weekly', 'campaign', 'rolling']
const OPERATIONS = ['NONE', 'MULTIPLY', 'PERCENTAGE', 'CAP']

function TriggerEditor({ mechanic }: { mechanic: WizardMechanic }) {
  const store = useWizardStore()
  const triggers = mechanic.triggers ?? []

  const addTrigger = () => {
    const trigger: WizardTrigger = {
      id: `trig-${Date.now()}`,
      eventType: 'BET',
      filters: {},
    }
    store.updateMechanic(mechanic.id, { triggers: [...triggers, trigger] })
  }

  const updateTrigger = (id: string, data: Partial<WizardTrigger>) => {
    store.updateMechanic(mechanic.id, {
      triggers: triggers.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })
  }

  const removeTrigger = (id: string) => {
    store.updateMechanic(mechanic.id, { triggers: triggers.filter((t) => t.id !== id) })
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-1.5">
        Triggers
        <Tooltip content="Events are player actions like placing a bet or making a deposit that the system tracks. Add the events that should feed into this mechanic.">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </Tooltip>
      </h4>
      {triggers.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-md border border-border p-2">
          <select
            value={t.eventType}
            onChange={(e) => updateTrigger(t.id, { eventType: e.target.value })}
            className="h-8 rounded border border-input bg-background px-2 text-sm flex-1"
          >
            {EVENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
          </select>
          <button onClick={() => removeTrigger(t.id)} className="p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button onClick={addTrigger} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus className="h-3 w-3" /> Add Trigger
      </button>
    </div>
  )
}

function AggregationEditor({ mechanic }: { mechanic: WizardMechanic }) {
  const store = useWizardStore()
  const rules = mechanic.aggregationRules ?? []

  const addRule = () => {
    const rule: WizardAggregationRule = {
      id: `agg-${Date.now()}`,
      sourceEventType: 'BET',
      metric: 'COUNT',
      windowType: 'campaign',
      transformation: [{ operation: 'NONE' }],
    }
    store.updateMechanic(mechanic.id, { aggregationRules: [...rules, rule] })
  }

  const updateRule = (id: string, data: Partial<WizardAggregationRule>) => {
    store.updateMechanic(mechanic.id, {
      aggregationRules: rules.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })
  }

  const removeRule = (id: string) => {
    store.updateMechanic(mechanic.id, { aggregationRules: rules.filter((r) => r.id !== id) })
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-1.5">
        Aggregation Rules
        <Tooltip content="Rules that tell the system how to calculate scores from raw events. For example: COUNT all BET events daily, or SUM the bet amounts for the entire campaign.">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </Tooltip>
      </h4>
      {rules.map((r) => (
        <div key={r.id} className="rounded-md border border-border p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select value={r.sourceEventType} onChange={(e) => updateRule(r.id, { sourceEventType: e.target.value })} className="h-8 rounded border border-input bg-background px-2 text-xs">
              {EVENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
            <select value={r.metric} onChange={(e) => updateRule(r.id, { metric: e.target.value as 'COUNT' | 'SUM' | 'AVERAGE' })} className="h-8 rounded border border-input bg-background px-2 text-xs">
              {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={r.windowType} onChange={(e) => updateRule(r.id, { windowType: e.target.value })} className="h-8 rounded border border-input bg-background px-2 text-xs">
              {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {r.windowType === 'rolling' && (
            <input
              type="number"
              value={r.windowSizeHours ?? ''}
              onChange={(e) => updateRule(r.id, { windowSizeHours: Number(e.target.value) || undefined })}
              placeholder="Window size (hours)"
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
            />
          )}

          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Pipeline:</span>
            {r.transformation.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                <select
                  value={step.operation}
                  onChange={(e) => {
                    const updated = [...r.transformation]
                    updated[i] = { ...step, operation: e.target.value }
                    updateRule(r.id, { transformation: updated })
                  }}
                  className="h-7 rounded border border-input bg-background px-1 text-xs"
                >
                  {OPERATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {(step.operation === 'MULTIPLY' || step.operation === 'PERCENTAGE' || step.operation === 'CAP') && (
                  <input
                    type="number"
                    value={step.parameter ?? ''}
                    onChange={(e) => {
                      const updated = [...r.transformation]
                      updated[i] = { ...step, parameter: Number(e.target.value) }
                      updateRule(r.id, { transformation: updated })
                    }}
                    placeholder="val"
                    className="h-7 w-16 rounded border border-input bg-background px-1 text-xs"
                  />
                )}
              </div>
            ))}
            <button
              onClick={() => updateRule(r.id, { transformation: [...r.transformation, { operation: 'NONE' }] })}
              className="text-xs text-primary hover:underline"
            >
              +step
            </button>
          </div>

          <button onClick={() => removeRule(r.id)} className="text-xs text-destructive hover:underline">Remove rule</button>
        </div>
      ))}
      <button onClick={addRule} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus className="h-3 w-3" /> Add Aggregation Rule
      </button>
      {rules.length > 0 && (
        <AggregationCalculator rules={rules} />
      )}
    </div>
  )
}

function AggregationCalculator({ rules }: { rules: WizardAggregationRule[] }) {
  const [testInput, setTestInput] = useState('')
  
  const calculate = (input: number, transformation: { operation: string; parameter?: number }[]) => {
    let value = input
    for (const step of transformation) {
      switch (step.operation) {
        case 'MULTIPLY':
          value = value * (step.parameter ?? 1)
          break
        case 'PERCENTAGE':
          value = value * ((step.parameter ?? 100) / 100)
          break
        case 'CAP':
          value = Math.min(value, step.parameter ?? Infinity)
          break
      }
    }
    return value
  }

  return (
    <div className="rounded-md border border-dashed border-border p-3 space-y-2 mt-3">
      <h5 className="text-xs font-medium text-muted-foreground">Test Calculator</h5>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Enter sample value"
          className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
        />
        {testInput && rules.map((r, i) => (
          <div key={i} className="text-xs text-muted-foreground">
            <span className="text-primary font-mono">{calculate(Number(testInput), r.transformation).toFixed(2)}</span>
            <span className="ml-1">({r.metric})</span>
          </div>
        ))}
      </div>
      {rules.length > 0 && testInput && (
        <p className="text-[10px] text-muted-foreground">
          Formula: Raw {rules[0].sourceEventType.toLowerCase()} → {rules[0].transformation.map(t => {
            if (t.operation === 'MULTIPLY') return `×${t.parameter}`
            if (t.operation === 'PERCENTAGE') return `${t.parameter}%`
            if (t.operation === 'CAP') return `cap at ${t.parameter}`
            return 'raw'
          }).join(' → ')} → {rules[0].metric} per {rules[0].windowType}
        </p>
      )}
    </div>
  )
}

export default function Step4Triggers() {
  const store = useWizardStore()
  const [expanded, setExpanded] = useState<string | null>(store.mechanics[0]?.id ?? null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Triggers & Aggregation</h2>
        <p className="text-sm text-muted-foreground">Configure event triggers and data pipeline for each mechanic</p>
      </div>

      <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-sm">
        <p className="font-medium text-blue-400">What are triggers and aggregation?</p>
        <p className="text-muted-foreground mt-1">Triggers are player actions the system listens for (like placing a bet or making a deposit). Aggregation rules define how those actions are counted and transformed into scores or progress values for each mechanic.</p>
      </div>

      {store.mechanics.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Add mechanics in Step 3 first
        </div>
      ) : (
        <div className="space-y-3">
          {store.mechanics.map((mech) => (
            <div key={mech.id} className="rounded-lg border border-border">
              <button
                onClick={() => setExpanded(expanded === mech.id ? null : mech.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {expanded === mech.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{mech.label}</span>
                <span className="text-xs text-muted-foreground">({mech.type})</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {mech.triggers.length} triggers · {mech.aggregationRules.length} rules
                </span>
              </button>
              {expanded === mech.id && (
                <div className="border-t border-border p-4 space-y-6">
                  <TriggerEditor mechanic={mech} />
                  <AggregationEditor mechanic={mech} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
