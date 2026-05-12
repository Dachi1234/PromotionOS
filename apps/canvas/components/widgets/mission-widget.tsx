'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useMissionState, useMissionClaim } from '@/hooks/use-canvas-data'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { MissionTemplateProps } from '@/components/templates/shared-types'
import { FastGamesQuest } from '@/components/templates/mission/fast-games-quest'
import {
  WidgetSkeleton,
  WidgetError,
  WidgetIneligible,
  WidgetCompleted,
} from '@/components/shared/widget-state'

type MissionTemplateKey = 'serious' | 'fast_games_quest'

interface MissionProps {
  mechanicId: string
  claimButtonLabel: string
  showTimeRemaining: boolean
  template: MissionTemplateKey
  accentColor: string
  textColor: string
  bgColor: string
}

const SAMPLE_STEPS: MissionTemplateProps['steps'] = [
  { order: 1, title: 'Place 5 bets', description: 'Place at least 5 bets on any market', status: 'completed', currentValue: 5, targetValue: 5, progressPercentage: 100 },
  { order: 2, title: 'Deposit 100 GEL', description: 'Make a deposit of at least 100 GEL', status: 'active', currentValue: 60, targetValue: 100, progressPercentage: 60 },
  { order: 3, title: 'Win 3 games', description: 'Win 3 games in any category', status: 'locked', currentValue: 0, targetValue: 3, progressPercentage: 0 },
]

/**
 * Serious default — numbered step cards with a gold accent rail. No emoji,
 * no cartoon icons. Active step gets a solid gold dot, locked steps a
 * dim ring, completed steps a filled check.
 */
function SeriousMission({ steps, onClaim, claimButtonLabel, accentColor, textColor, bgColor }: MissionTemplateProps & { claimButtonLabel?: string }) {
  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'
  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 10,
        border: `1px solid ${GOLD}40`,
        padding: 16,
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s) => {
          const done = s.status === 'completed' || s.status === 'claimed'
          const active = s.status === 'active'
          const locked = s.status === 'locked'
          const claimable = s.status === 'completed'
          return (
            <li
              key={s.order}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                border: `1px solid ${active ? GOLD : `${GOLD}25`}`,
                background: active ? `${GOLD}14` : 'rgba(255,255,255,0.02)',
                opacity: locked ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? GOLD : active ? `${GOLD}30` : 'transparent',
                  border: `1.5px solid ${GOLD}`,
                  color: done ? '#0B1220' : fg,
                  fontWeight: 800, fontSize: 12,
                  letterSpacing: '0.04em',
                }}
              >
                {done ? '✓' : s.order}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>{s.title}</div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{s.description}</div>
                {!locked && !done && (
                  <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${s.progressPercentage}%`, height: '100%', background: GOLD }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', opacity: 0.75, whiteSpace: 'nowrap' }}>
                {s.currentValue}/{s.targetValue}
              </div>
              {claimable && (
                <button
                  type="button"
                  onClick={() => onClaim(s.order)}
                  style={{
                    padding: '6px 12px', borderRadius: 4,
                    background: GOLD, color: '#0B1220',
                    border: 'none', fontWeight: 800, fontSize: 11,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {claimButtonLabel || 'Claim'}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export const MissionWidget: UserComponent<MissionProps> = (props) => {
  const { mechanicId, claimButtonLabel, template, accentColor, textColor, bgColor } = props
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
  }))

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)
  const builderMech = isBuilder ? builderMechanics.find((m) => m.id === mechanicId) : null
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

  const steps = isBuilder
    ? builderSteps
    : apiSteps.length > 0
      ? apiSteps
      : (isLoading ? SAMPLE_STEPS : apiSteps)

  const executionMode = isBuilder
    ? (builderExecMode as 'sequential' | 'parallel')
    : ((data as Record<string, unknown>)?.executionMode as 'sequential' | 'parallel' ?? 'sequential')

  const handleClaim = useCallback((stepOrder: number) => {
    if (isBuilder) return
    const step = rawSteps[stepOrder - 1]
    if (step?.stepId) claimMutation.mutate(step.stepId)
  }, [isBuilder, rawSteps, claimMutation])

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

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
    const allDone = apiSteps.length > 0 && apiSteps.every((s) => s.status === 'completed')
    if (allDone) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetCompleted title="Mission complete" description="All steps finished. Rewards on the way." />
        </div>
      )
    }
  }

  const Template = template === 'fast_games_quest' ? FastGamesQuest : SeriousMission
  return (
    <div ref={dragRef} className={ringClass}>
      <Template
        steps={steps}
        executionMode={executionMode}
        onClaim={handleClaim}
        claimButtonLabel={claimButtonLabel}
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
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="MISSION" />
      <CapabilityPanel widgetType="MISSION" />
      <label className="block text-xs font-medium">Template</label>
      <select value={props.template} onChange={(e) => setProp((p: MissionProps) => { p.template = e.target.value as MissionTemplateKey })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="serious">Serious (default)</option>
        <option value="fast_games_quest">Fast Games Quest</option>
      </select>
      <label className="block text-xs font-medium">Claim Button Label</label>
      <input value={props.claimButtonLabel} onChange={(e) => setProp((p: MissionProps) => { p.claimButtonLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={props.showTimeRemaining} onChange={(e) => setProp((p: MissionProps) => { p.showTimeRemaining = e.target.checked })} /> Show Time Remaining
      </label>
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: MissionProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: MissionProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: MissionProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

MissionWidget.craft = {
  displayName: 'Mission',
  props: {
    mechanicId: '',
    claimButtonLabel: '',
    showTimeRemaining: true,
    template: 'serious' as MissionTemplateKey,
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: MissionSettings },
}
