'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
}

export function ProgressBarConfig({ mechanic, onUpdate }: Props) {
  const config = mechanic.config

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Metric Type
          <Tooltip content="The player activity that fills the progress bar (e.g., total_bet_amount, deposit_count). Must match a metric you set up in the Triggers step.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <input type="text" value={String(config.metricType ?? '')} onChange={(e) => onUpdate({ metricType: e.target.value })} placeholder="e.g. total_bet_amount" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
        <p className="text-xs text-muted-foreground">Must match an aggregation rule from Step 4</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Target Value
          <Tooltip content="The goal the player needs to reach to fill the bar completely. For example, if metric is total_bet_amount and target is 1000, the bar fills when the player bets 1000 total.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <input type="number" value={String(config.targetValue ?? '')} onChange={(e) => onUpdate({ targetValue: Number(e.target.value) })} placeholder="e.g. 1000" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Auto-grant Reward
          <Tooltip content="Automatic = reward is given instantly when the bar is full. Manual Claim = player must click a button to collect their reward after filling the bar.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <div className="flex gap-3">
          <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${config.autoGrant === true ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <input type="radio" className="sr-only" checked={config.autoGrant === true} onChange={() => onUpdate({ autoGrant: true })} />
            Automatic
          </label>
          <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${config.autoGrant !== true ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <input type="radio" className="sr-only" checked={config.autoGrant !== true} onChange={() => onUpdate({ autoGrant: false })} />
            Manual Claim
          </label>
        </div>
      </div>
    </div>
  )
}
