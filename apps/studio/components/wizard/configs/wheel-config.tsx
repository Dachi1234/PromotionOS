'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { WizardMechanic } from '@/stores/wizard-store'

interface Props {
  mechanic: WizardMechanic
  onUpdate: (config: Record<string, unknown>) => void
  isWheelInWheel: boolean
}

export function WheelConfig({ mechanic, onUpdate, isWheelInWheel }: Props) {
  const config = mechanic.config

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          Spin Trigger
          <Tooltip content="Manual = player clicks a button to spin. Automatic = spin happens automatically when player visits the page.">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </Tooltip>
        </h3>
        <div className="flex gap-3">
          {(['manual', 'automatic'] as const).map((mode) => (
            <label key={mode} className={`flex-1 cursor-pointer rounded-lg border p-3 text-center text-sm transition-colors ${config.spinTrigger === mode ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <input type="radio" name="spinTrigger" className="sr-only" checked={config.spinTrigger === mode} onChange={() => onUpdate({ spinTrigger: mode })} />
              <span className="capitalize">{mode}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Spin Limits</h3>
        <p className="text-xs text-muted-foreground">Set to 0 for &quot;bonus-only&quot; mode — spins are only earned via EXTRA_SPIN rewards (e.g. from a Progress Bar).</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Max per day
              <Tooltip content="Maximum spins per player per day. Leave empty for unlimited daily spins.">
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <input type="number" min="0" value={String(config.maxSpinsPerDay ?? '')} onChange={(e) => onUpdate({ maxSpinsPerDay: e.target.value !== '' ? Number(e.target.value) : null })} placeholder="Unlimited" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Max per campaign
              <Tooltip content="Total base spins per player for the whole campaign. Bonus spins (from EXTRA_SPIN rewards) are added on top.">
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <input type="number" min="0" value={String(config.maxSpinsPerCampaign ?? '')} onChange={(e) => onUpdate({ maxSpinsPerCampaign: e.target.value !== '' ? Number(e.target.value) : null })} placeholder="Unlimited" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              Max total (per player)
              <Tooltip content="Total base spins per player overall. Set to 0 for bonus-only mode where spins must be earned via EXTRA_SPIN rewards.">
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <input type="number" min="0" value={String(config.maxSpinsTotal ?? '')} onChange={(e) => onUpdate({ maxSpinsTotal: e.target.value !== '' ? Number(e.target.value) : null })} placeholder="Unlimited" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Visual</h3>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            Spin animation duration (ms)
            <Tooltip content="How long the wheel spin animation lasts in milliseconds. 3000 = 3 seconds.">
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            </Tooltip>
          </label>
          <input type="number" value={String(config.animationDuration ?? 3000)} onChange={(e) => onUpdate({ animationDuration: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      {isWheelInWheel && (
        <div className="rounded-md bg-accent/50 p-3 text-sm text-muted-foreground">
          Condition gates for inner wheel slices are configured in Step 5 (Rewards).
        </div>
      )}
    </div>
  )
}
