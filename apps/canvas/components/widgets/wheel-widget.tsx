'use client'

import { useState, useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useSpin } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, WheelTemplateProps } from '@/components/templates/shared-types'
import { ClassicWheel } from '@/components/templates/wheel/classic-wheel'
import { ModernWheel } from '@/components/templates/wheel/modern-wheel'
import { NeonWheel } from '@/components/templates/wheel/neon-wheel'

interface WheelProps {
  mechanicId: string
  wheelSize: number
  spinButtonLabel: string
  spinButtonColor: string
  sliceColors: string[]
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const DEFAULT_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#0891b2', '#ea580c']

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<WheelTemplateProps>> = {
  classic: ClassicWheel,
  modern: ModernWheel,
  neon: NeonWheel,
}

export const WheelWidget: UserComponent<WheelProps> = (props) => {
  const { mechanicId, wheelSize, spinButtonLabel, spinButtonColor, sliceColors, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, language } = useCanvasStore()
  const spinMutation = useSpin(mechanicId || 'placeholder')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const colors = sliceColors.length > 0 ? sliceColors : DEFAULT_COLORS
  const sliceCount = colors.length

  const handleSpin = useCallback(async () => {
    if (isBuilder || spinning || !mechanicId) return
    setSpinning(true)
    setResult(null)
    try {
      const data = await spinMutation.mutateAsync()
      const outcome = data?.outcome as Record<string, unknown> | undefined
      const sliceIndex = (outcome?.sliceIndex as number) ?? Math.floor(Math.random() * sliceCount)
      const sliceAngle = 360 / sliceCount
      const targetAngle = 360 * 5 + (360 - sliceIndex * sliceAngle - sliceAngle / 2)
      setRotation((prev) => prev + targetAngle)
      setTimeout(() => {
        setSpinning(false)
        const reward = outcome?.reward as Record<string, unknown> | undefined
        setResult(reward?.type as string ?? t(language, 'wheel.prize'))
      }, 4000)
    } catch {
      setSpinning(false)
    }
  }, [isBuilder, spinning, mechanicId, spinMutation, sliceCount, language])

  const slices = colors.map((color, i) => ({
    label: `Slice ${i + 1}`,
    color,
  }))

  const TemplateComponent = TEMPLATE_MAP[template] || ClassicWheel

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={selected ? 'ring-2 ring-blue-500' : ''}>
      <TemplateComponent
        slices={slices}
        rotation={rotation}
        spinning={spinning}
        result={result}
        canSpin={!isBuilder && !spinning && !!mechanicId}
        spinsRemaining={null}
        onSpin={handleSpin}
        wheelSize={wheelSize}
        spinButtonLabel={spinButtonLabel || t(language, 'wheel.spin')}
        spinButtonColor={spinButtonColor}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function WheelSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as WheelProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="WHEEL" />
      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">Bound Mechanic ID</label>
        <input value={props.mechanicId} onChange={(e) => setProp((p: WheelProps) => { p.mechanicId = e.target.value })} placeholder="Select mechanic" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Wheel Size (px)</label>
        <input type="number" value={props.wheelSize} onChange={(e) => setProp((p: WheelProps) => { p.wheelSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Button Label</label>
        <input value={props.spinButtonLabel} onChange={(e) => setProp((p: WheelProps) => { p.spinButtonLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Button Color</label>
        <input type="color" value={props.spinButtonColor} onChange={(e) => setProp((p: WheelProps) => { p.spinButtonColor = e.target.value })} className="h-8 w-full" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: WheelProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: WheelProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: WheelProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

WheelWidget.craft = {
  displayName: 'Wheel',
  props: {
    mechanicId: '',
    wheelSize: 280,
    spinButtonLabel: '',
    spinButtonColor: '#7c3aed',
    sliceColors: [],
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: WheelSettings },
}
