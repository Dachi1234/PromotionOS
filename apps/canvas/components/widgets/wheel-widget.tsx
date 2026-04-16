'use client'

import { useState, useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useSpin, useMechanicFromCampaign, usePlayerState } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { TemplatePicker } from '@/components/builder/template-picker'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { TemplateStyle, WheelTemplateProps } from '@/components/templates/shared-types'
import { ClassicWheel } from '@/components/templates/wheel/classic-wheel'
import { ModernWheel } from '@/components/templates/wheel/modern-wheel'
import { NeonWheel } from '@/components/templates/wheel/neon-wheel'
import { LuxeWheel } from '@/components/templates/wheel/luxe-wheel'
import { StoryWheel } from '@/components/templates/wheel/story-wheel'
import { WidgetError, WidgetIneligible } from '@/components/shared/widget-state'
import { useSoundFx } from '@/components/runtime/sound-fx'

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
  luxe: LuxeWheel,
  story: StoryWheel,
}

export const WheelWidget: UserComponent<WheelProps> = (props) => {
  const { mechanicId, wheelSize, spinButtonLabel, spinButtonColor, sliceColors, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, isAdminPreview, language, campaignSlug } = useCanvasStore()
  const spinMutation = useSpin(mechanicId || 'placeholder')
  const mechanicDetail = useMechanicFromCampaign(isBuilder ? null : campaignSlug, mechanicId)
  const { data: playerState } = usePlayerState(isBuilder ? null : campaignSlug)
  const sfx = useSoundFx()
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [spinError, setSpinError] = useState<string | null>(null)

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)

  const rewardSlices: { label: string; color: string }[] = []
  const rewardSource = isBuilder
    ? builderMechanics.find((m) => m.id === mechanicId)?.rewards
    : mechanicDetail?.rewards

  if (rewardSource && rewardSource.length > 0) {
    rewardSource.forEach((r, i) => {
      const label = (r.config?.label as string) || r.type || `Prize ${i + 1}`
      rewardSlices.push({ label, color: sliceColors[i] || DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
    })
  }

  const colors = sliceColors.length > 0 ? sliceColors : DEFAULT_COLORS
  const slices = rewardSlices.length > 0 ? rewardSlices : colors.map((color, i) => ({ label: `Slice ${i + 1}`, color }))
  const sliceCount = slices.length

  const mechanicState = playerState?.mechanics?.[mechanicId] as Record<string, unknown> | undefined
  const spinsRemaining = mechanicState?.spinsRemaining as { canSpin?: boolean; daily?: { used: number; max: number } | null } | undefined
  const canSpinFromState = spinsRemaining?.canSpin !== false

  const handleSpin = useCallback(async () => {
    if (isBuilder || isAdminPreview || spinning || !mechanicId) return
    setSpinning(true)
    setResult(null)
    setSpinError(null)
    // Click feedback fires immediately — players expect instant tactile
    // confirmation even before the spin animation resolves.
    sfx.feedback('click')
    try {
      const data = await spinMutation.mutateAsync()
      const sliceIndex = data?.sliceIndex ?? Math.floor(Math.random() * sliceCount)
      const sliceAngle = 360 / sliceCount
      const targetAngle = 360 * 5 + (360 - sliceIndex * sliceAngle - sliceAngle / 2)
      setRotation((prev) => prev + targetAngle)
      setTimeout(() => {
        setSpinning(false)
        setResult(data?.rewardType ?? t(language, 'wheel.prize'))
        // Win payoff — fires at animation rest so the cue lands on the
        // reveal, not during the blur.
        sfx.feedback('win')
      }, 4000)
    } catch (err) {
      setSpinning(false)
      const msg = err instanceof Error ? err.message : 'Spin failed'
      setSpinError(msg)
      sfx.feedback('error')
    }
  }, [isBuilder, isAdminPreview, spinning, mechanicId, spinMutation, sliceCount, language, sfx])

  const TemplateComponent = TEMPLATE_MAP[template] || ClassicWheel

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  // No mechanic bound in runtime — show a friendly placeholder instead of a
  // silent no-op wheel that can't spin.
  if (!isBuilder && !mechanicId) {
    return (
      <div ref={dragRef} className={ringClass}>
        <WidgetIneligible reason="Wheel is not bound to a mechanic yet." />
      </div>
    )
  }

  return (
    <div ref={dragRef} className={ringClass}>
      <TemplateComponent
        slices={slices}
        rotation={rotation}
        spinning={spinning}
        result={result}
        canSpin={!isBuilder && !isAdminPreview && !spinning && !!mechanicId && canSpinFromState}
        spinsRemaining={spinsRemaining?.daily?.max != null ? spinsRemaining.daily.max - spinsRemaining.daily.used : null}
        onSpin={handleSpin}
        wheelSize={wheelSize}
        spinButtonLabel={spinButtonLabel || t(language, 'wheel.spin')}
        spinButtonColor={spinButtonColor}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
      {spinError && (
        <div className="mt-2">
          <WidgetError
            detail={spinError}
            onRetry={() => setSpinError(null)}
          />
        </div>
      )}
    </div>
  )
}

function WheelSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as WheelProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="WHEEL" />
      <div className="space-y-3 p-3">
        <MechanicPicker widgetType="WHEEL" />
        <CapabilityPanel widgetType="WHEEL" />
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
