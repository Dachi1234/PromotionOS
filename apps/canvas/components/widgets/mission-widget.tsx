'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useMissionState, useClaimReward } from '@/hooks/use-canvas-data'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, MissionTemplateProps } from '@/components/templates/shared-types'
import { QuestMap } from '@/components/templates/mission/quest-map'
import { ChecklistCards } from '@/components/templates/mission/checklist-cards'
import { NeonProgressTrack } from '@/components/templates/mission/neon-progress-track'

interface MissionProps {
  mechanicId: string
  claimButtonLabel: string
  showTimeRemaining: boolean
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const SAMPLE_STEPS: MissionTemplateProps['steps'] = [
  { order: 1, title: 'Place 5 bets', description: 'Place at least 5 bets on any market', status: 'completed', currentValue: 5, targetValue: 5, progressPercentage: 100 },
  { order: 2, title: 'Deposit 100 GEL', description: 'Make a deposit of at least 100 GEL', status: 'active', currentValue: 60, targetValue: 100, progressPercentage: 60 },
  { order: 3, title: 'Win 3 games', description: 'Win 3 games in any category', status: 'locked', currentValue: 0, targetValue: 3, progressPercentage: 0 },
]

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<MissionTemplateProps>> = {
  classic: QuestMap,
  modern: ChecklistCards,
  neon: NeonProgressTrack,
}

export const MissionWidget: UserComponent<MissionProps> = (props) => {
  const { mechanicId, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder } = useCanvasStore()
  const { data } = useMissionState(isBuilder ? null : mechanicId)
  const claimMutation = useClaimReward()

  const rawSteps = (data?.steps ?? []) as { id: string; title: string; status: string; progress: number; target: number; description?: string; expiresAt?: string }[]
  const apiSteps: MissionTemplateProps['steps'] = rawSteps.map((s, i) => ({
    order: i + 1,
    title: s.title,
    description: s.description || '',
    status: s.status as MissionTemplateProps['steps'][number]['status'],
    currentValue: s.progress,
    targetValue: s.target,
    progressPercentage: s.target > 0 ? Math.min(100, (s.progress / s.target) * 100) : 0,
    expiresAt: s.expiresAt,
  }))

  const steps = isBuilder ? SAMPLE_STEPS : apiSteps
  const executionMode = (data as Record<string, unknown>)?.executionMode as 'sequential' | 'parallel' ?? 'sequential'

  const handleClaim = useCallback((stepOrder: number) => {
    if (isBuilder) return
    const step = rawSteps[stepOrder - 1]
    if (step) claimMutation.mutate(step.id)
  }, [isBuilder, rawSteps, claimMutation])

  const TemplateComponent = TEMPLATE_MAP[template] || QuestMap

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={selected ? 'ring-2 ring-blue-500' : ''}>
      <TemplateComponent
        steps={steps}
        executionMode={executionMode}
        onClaim={handleClaim}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function MissionSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as MissionProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="MISSION" />
      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">Bound Mechanic ID</label>
        <input value={props.mechanicId} onChange={(e) => setProp((p: MissionProps) => { p.mechanicId = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Claim Button Label</label>
        <input value={props.claimButtonLabel} onChange={(e) => setProp((p: MissionProps) => { p.claimButtonLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="flex items-center gap-2 text-xs font-medium">
          <input type="checkbox" checked={props.showTimeRemaining} onChange={(e) => setProp((p: MissionProps) => { p.showTimeRemaining = e.target.checked })} /> Show Time Remaining
        </label>
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: MissionProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: MissionProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: MissionProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

MissionWidget.craft = {
  displayName: 'Mission',
  props: {
    mechanicId: '',
    claimButtonLabel: '',
    showTimeRemaining: true,
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: MissionSettings },
}
