'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useMissionState, useMissionClaim } from '@/hooks/use-canvas-data'
import { TemplatePicker } from '@/components/builder/template-picker'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { TemplateStyle, MissionTemplateProps } from '@/components/templates/shared-types'
import { QuestMap } from '@/components/templates/mission/quest-map'
import { ChecklistCards } from '@/components/templates/mission/checklist-cards'
import { NeonProgressTrack } from '@/components/templates/mission/neon-progress-track'
import { LuxeMission } from '@/components/templates/mission/luxe-mission'
import {
  WidgetSkeleton,
  WidgetError,
  WidgetIneligible,
  WidgetCompleted,
} from '@/components/shared/widget-state'

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
  luxe: LuxeMission,
  // Mission doesn't have a dedicated story renderer yet — LuxeMission already
  // reads tokens and stacks vertically, which is close enough to serve as
  // the story alias.
  story: LuxeMission,
}

export const MissionWidget: UserComponent<MissionProps> = (props) => {
  const { mechanicId, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder } = useCanvasStore()
  const { data, isLoading, error } = useMissionState(isBuilder ? null : mechanicId)
  const claimMutation = useMissionClaim(mechanicId)

  const rawSteps = (data?.steps ?? []) as { stepId: string; title: string; status: string; currentValue: number; targetValue: number; percentage: number; description?: string; expiresAt?: string }[]
  const apiSteps: MissionTemplateProps['steps'] = rawSteps.map((s, i) => ({
    order: i + 1,
    title: s.title,
    description: s.description || '',
    status: s.status as MissionTemplateProps['steps'][number]['status'],
    currentValue: s.currentValue,
    targetValue: s.targetValue,
    progressPercentage: s.percentage ?? (s.targetValue > 0 ? Math.min(100, (s.currentValue / s.targetValue) * 100) : 0),
    expiresAt: s.expiresAt,
    stepId: s.stepId,
  }))

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)
  const builderMech = isBuilder ? builderMechanics.find((m) => m.id === mechanicId) : null

  // Read mission steps from mechanic config (engine format), NOT from rewards
  const configSteps = (builderMech?.config?.steps as { step_id: string; order: number; title: string; metric_type: string; target_value: number; time_limit_hours: number }[]) ?? []

  const builderSteps: MissionTemplateProps['steps'] = configSteps.length > 0
    ? configSteps.map((s, i) => ({
        order: s.order ?? i + 1,
        title: s.title || `Step ${i + 1}`,
        description: `${s.metric_type ?? 'BET_COUNT'} ≥ ${s.target_value ?? 1}`,
        status: i === 0 ? 'active' : 'locked' as MissionTemplateProps['steps'][number]['status'],
        currentValue: 0,
        targetValue: s.target_value ?? 1,
        progressPercentage: 0,
      }))
    : SAMPLE_STEPS

  const builderExecMode = (builderMech?.config?.execution_mode as string) ?? 'sequential'

  // In runtime: if no API data yet, show loading or sample steps; in builder show config steps
  const steps = isBuilder
    ? builderSteps
    : apiSteps.length > 0
      ? apiSteps
      : (isLoading ? SAMPLE_STEPS : apiSteps) // show sample while loading, empty if truly no data

  const executionMode = isBuilder
    ? (builderExecMode as 'sequential' | 'parallel')
    : ((data as Record<string, unknown>)?.executionMode as 'sequential' | 'parallel' ?? 'sequential')

  const handleClaim = useCallback((stepOrder: number) => {
    if (isBuilder) return
    const step = rawSteps[stepOrder - 1]
    if (step?.stepId) claimMutation.mutate(step.stepId)
  }, [isBuilder, rawSteps, claimMutation])

  const TemplateComponent = TEMPLATE_MAP[template] || QuestMap

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  // Runtime-only non-happy-path branches. Builder always renders the template
  // so designers can still style it without data.
  if (!isBuilder) {
    if (!mechanicId) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetIneligible reason="Mission widget is not bound to a mechanic yet. Pick one in the settings panel." />
        </div>
      )
    }
    if (isLoading && apiSteps.length === 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetSkeleton lines={4} />
        </div>
      )
    }
    if (error) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetError detail={error instanceof Error ? error.message : 'Failed to load mission'} />
        </div>
      )
    }
    // All steps completed + nothing left to claim → terminal state.
    const allDone = apiSteps.length > 0 && apiSteps.every((s) => s.status === 'completed')
    if (allDone) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetCompleted title="Mission complete" description="All steps finished. Rewards on the way." />
        </div>
      )
    }
  }

  return (
    <div ref={dragRef} className={ringClass}>
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
        <MechanicPicker widgetType="MISSION" />
        <CapabilityPanel widgetType="MISSION" />
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
