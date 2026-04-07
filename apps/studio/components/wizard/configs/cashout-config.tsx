'use client'

import { Plus, Trash2, HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'
import type { ConditionNode } from '@/stores/wizard-store'

const CASHOUT_CONDITION_TYPES = [
  { value: 'MIN_BET_AMOUNT', label: 'Min Bet Amount' },
  { value: 'MIN_DEPOSIT_COUNT', label: 'Min Deposit Count' },
  { value: 'MIN_BET_COUNT', label: 'Min Bet Count' },
]

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
}

export function CashoutConfig({ mechanic, onUpdate }: Props) {
  const config = mechanic.config
  const conditions = ((config.conditionTree as ConditionNode)?.conditions ?? []) as ConditionNode[]
  const operator = (config.conditionTree as ConditionNode)?.operator ?? 'AND'

  const updateTree = (tree: ConditionNode) => {
    onUpdate({ conditionTree: tree })
  }

  const addCondition = () => {
    updateTree({ operator, conditions: [...conditions, { type: '', value: '' }] })
  }

  const updateCondition = (i: number, c: ConditionNode) => {
    const updated = [...conditions]
    updated[i] = c
    updateTree({ operator, conditions: updated })
  }

  const removeCondition = (i: number) => {
    updateTree({ operator, conditions: conditions.filter((_, j) => j !== i) })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Max Claims per Player
            <Tooltip content="How many times a single player can claim this reward during the campaign. For example, 3 means each player can cash out up to 3 times.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input type="number" value={String(config.maxClaims ?? '')} onChange={(e) => onUpdate({ maxClaims: Number(e.target.value) })} placeholder="e.g. 3" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Cooldown (hours)
            <Tooltip content="Minimum waiting time between claims. For example, 24 hours means a player must wait one full day after claiming before they can claim again.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input type="number" value={String(config.cooldownHours ?? '')} onChange={(e) => onUpdate({ cooldownHours: Number(e.target.value) })} placeholder="e.g. 24" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            Claim Conditions
            <Tooltip content="Rules the player must satisfy before they can claim the reward. AND = all conditions must be met. OR = any one condition is enough. Click the AND/OR button to toggle.">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </Tooltip>
          </h3>
          <button onClick={() => updateTree({ operator: operator === 'AND' ? 'OR' : 'AND', conditions })} className="rounded bg-accent px-2 py-0.5 text-xs font-bold">{operator}</button>
        </div>

        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border p-2">
              <select value={c.type ?? ''} onChange={(e) => updateCondition(i, { ...c, type: e.target.value })} className="h-8 rounded border border-input bg-background px-2 text-xs">
                <option value="">Select</option>
                {CASHOUT_CONDITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="number" value={String(c.value ?? '')} onChange={(e) => updateCondition(i, { ...c, value: Number(e.target.value) })} placeholder="Value" className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs" />
              <button onClick={() => removeCondition(i)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addCondition} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <Plus className="h-3 w-3" /> Add Condition
        </button>
      </div>
    </div>
  )
}
