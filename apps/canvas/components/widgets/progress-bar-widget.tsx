'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerState, useProgressClaim } from '@/hooks/use-canvas-data'
import { TemplatePicker } from '@/components/builder/template-picker'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import type { TemplateStyle, ProgressBarTemplateProps } from '@/components/templates/shared-types'
import { TreasureFill } from '@/components/templates/progress-bar/treasure-fill'
import { CleanLinearBar } from '@/components/templates/progress-bar/clean-linear-bar'
import { NeonPowerMeter } from '@/components/templates/progress-bar/neon-power-meter'

interface PBProps {
  mechanicId: string
  rewardTeaser: string
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<ProgressBarTemplateProps>> = {
  classic: TreasureFill,
  modern: CleanLinearBar,
  neon: NeonPowerMeter,
}

export const ProgressBarWidget: UserComponent<PBProps> = (props) => {
  const { mechanicId, template, rewardTeaser, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, campaignSlug } = useCanvasStore()
  const { data: playerState } = usePlayerState(isBuilder ? null : campaignSlug)
  const claimMutation = useProgressClaim(mechanicId)

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)
  const builderMech = isBuilder ? builderMechanics.find((m) => m.id === mechanicId) : null
  const builderTarget = (builderMech?.config?.target_value ?? builderMech?.config?.targetValue ?? builderMech?.rewards?.[0]?.config?.targetValue) as number | undefined

  const mechanicState = playerState?.mechanics?.[mechanicId] as Record<string, unknown> | undefined
  const apiCurrent = mechanicState?.current as number | undefined
  const apiTarget = mechanicState?.target as number | undefined

  const targetValue = isBuilder ? (builderTarget ?? 1000) : (apiTarget ?? 1)
  const currentValue = isBuilder ? Math.round(targetValue * 0.65) : (apiCurrent ?? 0)
  const pct = Math.min(100, (currentValue / Math.max(targetValue, 1)) * 100)
  const completed = isBuilder ? false : (mechanicState?.completed as boolean ?? pct >= 100)
  const claimed = isBuilder ? false : (mechanicState?.claimed as boolean ?? false)

  const handleClaim = useCallback(() => {
    if (isBuilder || claimed) return
    claimMutation.mutate()
  }, [isBuilder, claimed, claimMutation])

  const TemplateComponent = TEMPLATE_MAP[template] || TreasureFill

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={selected ? 'ring-2 ring-blue-500' : ''}>
      <TemplateComponent
        currentValue={currentValue}
        targetValue={targetValue}
        progressPercentage={pct}
        completed={completed}
        claimed={claimed}
        rewardLabel={rewardTeaser || 'Complete to win a prize!'}
        onClaim={handleClaim}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function PBSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as PBProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="PROGRESS_BAR" />
      <div className="space-y-3 p-3">
        <MechanicPicker widgetType="PROGRESS_BAR" />
        <label className="block text-xs font-medium">Reward Teaser</label>
        <input value={props.rewardTeaser} onChange={(e) => setProp((p: PBProps) => { p.rewardTeaser = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: PBProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: PBProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: PBProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

ProgressBarWidget.craft = {
  displayName: 'Progress Bar',
  props: {
    mechanicId: '',
    rewardTeaser: 'Complete to win a prize!',
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: PBSettings },
}
