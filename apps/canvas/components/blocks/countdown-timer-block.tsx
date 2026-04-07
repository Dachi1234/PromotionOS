'use client'

import { useState, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, CountdownTemplateProps } from '@/components/templates/shared-types'
import { FlipClock } from '@/components/templates/countdown/flip-clock'
import { CleanDigits } from '@/components/templates/countdown/clean-digits'
import { NeonCountdown } from '@/components/templates/countdown/neon-countdown'

interface CountdownProps {
  targetDate: string
  label: string
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<CountdownTemplateProps>> = {
  classic: FlipClock,
  modern: CleanDigits,
  neon: NeonCountdown,
}

function useCountdownTarget(targetDate: string, isBuilder: boolean) {
  const fallback = isBuilder && !targetDate
    ? new Date(Date.now() + 12 * 86400000 + 8 * 3600000 + 45 * 60000 + 30000).toISOString()
    : targetDate

  return fallback
}

export const CountdownTimerBlock: UserComponent<CountdownProps> = (props) => {
  const { targetDate, label, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const isBuilder = useCanvasStore((s) => s.isBuilder)

  const effectiveTarget = useCountdownTarget(targetDate, isBuilder)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (isBuilder || !effectiveTarget) return
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [effectiveTarget, isBuilder])

  const TemplateComponent = TEMPLATE_MAP[template] || FlipClock

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={selected ? 'ring-2 ring-blue-500' : ''}>
      <TemplateComponent
        targetDate={effectiveTarget}
        label={label || 'Ends in'}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function CountdownSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as CountdownProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="COUNTDOWN" />
      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">Target Date</label>
        <input type="datetime-local" value={props.targetDate} onChange={(e) => setProp((p: CountdownProps) => { p.targetDate = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Label</label>
        <input value={props.label} onChange={(e) => setProp((p: CountdownProps) => { p.label = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: CountdownProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: CountdownProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: CountdownProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

CountdownTimerBlock.craft = {
  displayName: 'Countdown',
  props: {
    targetDate: '',
    label: 'Ends in',
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: CountdownSettings },
}
