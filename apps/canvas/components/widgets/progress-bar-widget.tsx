'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerState, useProgressClaim } from '@/hooks/use-canvas-data'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { ProgressBarTemplateProps } from '@/components/templates/shared-types'
import { MarathonProgress } from '@/components/templates/progress-bar/marathon-progress'
import {
  WidgetSkeleton,
  WidgetIneligible,
  WidgetCompleted,
  WidgetAlmostThere,
} from '@/components/shared/widget-state'
import { PulseOn } from '@/components/motion/pulse-on'
import { CountUp } from '@/components/motion/count-up'

type PBTemplateKey = 'serious' | 'marathon'

interface PBProps {
  mechanicId: string
  rewardTeaser: string
  template: PBTemplateKey
  accentColor: string
  textColor: string
  bgColor: string
}

/**
 * Serious default progress bar — dark panel, gold fill, tabular numerics.
 */
function SeriousProgress({ currentValue, targetValue, progressPercentage, completed, claimed, rewardLabel, onClaim, accentColor, textColor, bgColor }: ProgressBarTemplateProps) {
  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'
  return (
    <div
      style={{
        background: bg, color: fg,
        borderRadius: 10, border: `1px solid ${GOLD}40`,
        padding: '16px 18px',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {rewardLabel}
        </div>
        <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', opacity: 0.8, fontWeight: 700 }}>
          <CountUp value={currentValue} /> / {targetValue.toLocaleString()}
        </div>
      </div>
      <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden', border: `1px solid ${GOLD}25` }}>
        <div
          style={{
            width: `${Math.min(100, progressPercentage)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${GOLD} 0%, #F5E19A 100%)`,
            transition: 'width 400ms ease',
          }}
        />
      </div>
      {completed && !claimed && (
        <button
          type="button"
          onClick={onClaim}
          style={{
            marginTop: 12, width: '100%',
            padding: '10px 18px', borderRadius: 6,
            background: GOLD, color: '#0B1220', border: 'none',
            fontWeight: 800, fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          Claim Reward
        </button>
      )}
    </div>
  )
}

export const ProgressBarWidget: UserComponent<PBProps> = (props) => {
  const { mechanicId, rewardTeaser, template, accentColor, textColor, bgColor } = props
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

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  if (!isBuilder) {
    if (!mechanicId) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetIneligible reason="Progress bar is not bound to a mechanic yet." />
        </div>
      )
    }
    if (!mechanicState) {
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
          {(() => {
            const Template = template === 'marathon' ? MarathonProgress : SeriousProgress
            return <Template
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
          })()}
        </PulseOn>
      </div>
    </div>
  )
}

function PBSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as PBProps }))
  return (
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="PROGRESS_BAR" />
      <CapabilityPanel widgetType="PROGRESS_BAR" />
      <label className="block text-xs font-medium">Template</label>
      <select value={props.template} onChange={(e) => setProp((p: PBProps) => { p.template = e.target.value as PBTemplateKey })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="serious">Serious (default bar)</option>
        <option value="marathon">Marathon (ring hero)</option>
      </select>
      <label className="block text-xs font-medium">Reward Teaser</label>
      <input value={props.rewardTeaser} onChange={(e) => setProp((p: PBProps) => { p.rewardTeaser = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: PBProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: PBProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: PBProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

ProgressBarWidget.craft = {
  displayName: 'Progress Bar',
  props: {
    mechanicId: '',
    rewardTeaser: 'Complete to win a prize!',
    template: 'serious' as PBTemplateKey,
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: PBSettings },
}
