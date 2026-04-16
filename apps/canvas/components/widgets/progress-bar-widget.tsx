'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerState, useProgressClaim } from '@/hooks/use-canvas-data'
import { TemplatePicker } from '@/components/builder/template-picker'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { TemplateStyle, ProgressBarTemplateProps } from '@/components/templates/shared-types'
import { TreasureFill } from '@/components/templates/progress-bar/treasure-fill'
import { CleanLinearBar } from '@/components/templates/progress-bar/clean-linear-bar'
import { NeonPowerMeter } from '@/components/templates/progress-bar/neon-power-meter'
import { LuxeProgressBar } from '@/components/templates/progress-bar/luxe-progress-bar'
import { StoryProgressBar } from '@/components/templates/progress-bar/story-progress-bar'
import {
  WidgetSkeleton,
  WidgetIneligible,
  WidgetCompleted,
  WidgetAlmostThere,
} from '@/components/shared/widget-state'
import { PulseOn } from '@/components/motion/pulse-on'
import { CountUp } from '@/components/motion/count-up'

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
  luxe: LuxeProgressBar,
  story: StoryProgressBar,
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

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  // Runtime non-happy-path states. Builder always renders the template.
  if (!isBuilder) {
    if (!mechanicId) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetIneligible reason="Progress bar is not bound to a mechanic yet." />
        </div>
      )
    }
    if (!mechanicState) {
      // Query still in flight (player-state) — show shimmer rather than "0 / 1".
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetSkeleton lines={2} />
        </div>
      )
    }
    if (completed && claimed) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetCompleted
            title="Reward claimed"
            description={rewardTeaser || 'You finished this challenge.'}
          >
            <div className="text-sm text-muted-foreground">
              <CountUp value={currentValue} /> / <CountUp value={targetValue} />
            </div>
          </WidgetCompleted>
        </div>
      )
    }
  }

  // Happy path — wrap the fill in a subtle pulse that fires whenever the
  // player's current value changes (SSE push or claim mutation). When the
  // player crosses 80% but hasn't completed yet we stack an "Almost there"
  // motivator above the bar.
  const fraction = Math.min(1, currentValue / Math.max(targetValue, 1))
  const showAlmost = !completed && !claimed && fraction >= 0.8 && fraction < 1

  return (
    <div ref={dragRef} className={ringClass}>
      <div className="space-y-3">
        {showAlmost && (
          <WidgetAlmostThere
            progress={fraction}
            label="Almost there!"
            description={rewardTeaser ? `${rewardTeaser} is within reach.` : undefined}
          />
        )}
        <PulseOn watch={currentValue} tone="accent">
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
        </PulseOn>
      </div>
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
        <CapabilityPanel widgetType="PROGRESS_BAR" />
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
