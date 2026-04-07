'use client'

import { X } from 'lucide-react'
import { useWizardStore, type WizardMechanic } from '@/stores/wizard-store'
import { WheelConfig } from './configs/wheel-config'
import { LeaderboardConfig } from './configs/leaderboard-config'
import { MissionConfig } from './configs/mission-config'
import { ProgressBarConfig } from './configs/progress-bar-config'
import { CashoutConfig } from './configs/cashout-config'

interface Props {
  mechanic: WizardMechanic
  onClose: () => void
}

export function MechanicConfigDrawer({ mechanic, onClose }: Props) {
  const updateMechanic = useWizardStore((s) => s.updateMechanic)

  const updateConfig = (config: Record<string, unknown>) => {
    updateMechanic(mechanic.id, { config: { ...mechanic.config, ...config } })
  }

  const ConfigComponent = (() => {
    switch (mechanic.type) {
      case 'WHEEL':
      case 'WHEEL_IN_WHEEL':
        return <WheelConfig mechanic={mechanic} onUpdate={updateConfig} isWheelInWheel={mechanic.type === 'WHEEL_IN_WHEEL'} />
      case 'LEADERBOARD':
        return <LeaderboardConfig mechanic={mechanic} onUpdate={updateConfig} isLayered={false} />
      case 'LEADERBOARD_LAYERED':
        return <LeaderboardConfig mechanic={mechanic} onUpdate={updateConfig} isLayered={true} />
      case 'MISSION':
        return <MissionConfig mechanic={mechanic} onUpdate={updateConfig} />
      case 'PROGRESS_BAR':
        return <ProgressBarConfig mechanic={mechanic} onUpdate={updateConfig} />
      case 'CASHOUT':
        return <CashoutConfig mechanic={mechanic} onUpdate={updateConfig} />
      default:
        return <p className="text-sm text-muted-foreground">No configuration available for this mechanic type</p>
    }
  })()

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="font-semibold">{mechanic.label} Configuration</h2>
            <p className="text-xs text-muted-foreground">{mechanic.type}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {ConfigComponent}
        </div>
      </div>
    </div>
  )
}
