'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { TemplatePicker } from '@/components/builder/template-picker'
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
  const { template, rewardTeaser, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder } = useCanvasStore()

  const currentValue = isBuilder ? 650 : 0
  const targetValue = isBuilder ? 1000 : 1
  const pct = Math.min(100, (currentValue / targetValue) * 100)
  const completed = pct >= 100
  const claimed = false

  const handleClaim = useCallback(() => {
    if (isBuilder) return
  }, [isBuilder])

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
        <label className="block text-xs font-medium">Bound Mechanic ID</label>
        <input value={props.mechanicId} onChange={(e) => setProp((p: PBProps) => { p.mechanicId = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
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
