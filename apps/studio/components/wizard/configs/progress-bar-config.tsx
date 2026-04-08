'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'
import { buildMetricOptions } from '@/lib/metric-options'

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
}

export function ProgressBarConfig({ mechanic, onUpdate }: Props) {
  const config = mechanic.config

  const metricOptions = buildMetricOptions(mechanic.aggregationRules as { sourceEventType: string; metric: string; windowType: string }[] | undefined)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Metric Type
          <Tooltip content="Select which aggregation metric fills the progress bar. Options come from the aggregation rules you set up in Step 4 for this mechanic.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <select
          value={String(config.metricType ?? '')}
          onChange={(e) => onUpdate({ metricType: e.target.value })}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select metric...</option>
          {metricOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium flex items-center gap-1.5">
          Target Value
          <Tooltip content="The goal the player needs to reach to fill the bar completely. For example, if metric is BET_SUM and target is 100, the bar fills when the player bets 100 total.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </label>
        <input type="number" value={String(config.targetValue ?? '')} onChange={(e) => onUpdate({ targetValue: Number(e.target.value) })} placeholder="e.g. 100" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
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
