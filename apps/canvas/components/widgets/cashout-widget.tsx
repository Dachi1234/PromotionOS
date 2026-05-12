'use client'

import { useCallback, useState, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerState, useCashoutClaim } from '@/hooks/use-canvas-data'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import {
  WidgetSkeleton,
  WidgetIneligible,
  WidgetCompleted,
  WidgetError,
} from '@/components/shared/widget-state'
import { CountUp } from '@/components/motion/count-up'
import { useSoundFx } from '@/components/runtime/sound-fx'
import { EGTCashback } from '@/components/templates/cashout/egt-cashback'

type CashoutTemplateKey = 'serious' | 'egt_cashback'

const SAMPLE_CONDITIONS = [
  { label: 'Weekly turnover ≥ 500 GEL',     met: true,  currentValue: 520,  targetValue: 500 },
  { label: 'Make a deposit ≥ 100 GEL',      met: true,  currentValue: 100,  targetValue: 100 },
  { label: 'Play at least 30 spins',        met: false, currentValue: 18,   targetValue: 30 },
  { label: 'Place 3 live casino bets',      met: false, currentValue: 1,    targetValue: 3 },
]

interface CashoutProps {
  mechanicId: string
  rewardTeaser: string
  claimLabel: string
  template: CashoutTemplateKey
  accentColor: string
  textColor: string
  bgColor: string
}

export const CashoutWidget: UserComponent<CashoutProps> = (props) => {
  const { mechanicId, rewardTeaser, claimLabel, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, campaignSlug } = useCanvasStore()
  const { data: playerState } = usePlayerState(isBuilder ? null : campaignSlug)
  const claimMutation = useCashoutClaim(mechanicId)
  const sfx = useSoundFx()

  const mechanicState = playerState?.mechanics?.[mechanicId] as Record<string, unknown> | undefined
  const canClaim = (mechanicState?.canClaim as boolean) ?? false
  const claimsUsed = (mechanicState?.claimsUsed as number) ?? 0
  const maxClaims = (mechanicState?.maxClaims as number) ?? 1
  const cooldownEndsAt = mechanicState?.cooldownEndsAt as string | undefined

  const [cooldownLeft, setCooldownLeft] = useState('')
  useEffect(() => {
    if (!cooldownEndsAt) { setCooldownLeft(''); return }
    const tick = () => {
      const diff = new Date(cooldownEndsAt).getTime() - Date.now()
      if (diff <= 0) { setCooldownLeft(''); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setCooldownLeft(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [cooldownEndsAt])

  const handleClaim = useCallback(() => {
    if (isBuilder || !canClaim) return
    sfx.feedback('coin')
    claimMutation.mutate()
  }, [isBuilder, canClaim, claimMutation, sfx])

  const builderMode = isBuilder

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  if (!isBuilder) {
    if (!mechanicId) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetIneligible reason="Cashout is not bound to a mechanic yet." />
        </div>
      )
    }
    if (!mechanicState) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetSkeleton lines={3} />
        </div>
      )
    }
    if (claimsUsed >= maxClaims && maxClaims > 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetCompleted
            title="Reward claimed"
            description={rewardTeaser || 'You can come back when the next window opens.'}
          />
        </div>
      )
    }
  }

  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'

  if (template === 'egt_cashback') {
    // API shape doesn't expose per-condition progress yet — in runtime we
    // synthesize a single "can claim" condition; in builder we show the
    // richer sample set so the template reads correctly when previewing.
    const conditions = isBuilder
      ? SAMPLE_CONDITIONS
      : [{ label: rewardTeaser || 'Eligibility check', met: canClaim, currentValue: canClaim ? 1 : 0, targetValue: 1 }]
    return (
      <div ref={dragRef} className={ringClass}>
        <EGTCashback
          conditions={conditions}
          allConditionsMet={isBuilder ? false : canClaim}
          rewardLabel={rewardTeaser || 'Weekly Cashback'}
          claimsUsed={isBuilder ? 0 : claimsUsed}
          maxClaims={isBuilder ? 1 : maxClaims}
          cooldownEndsAt={cooldownEndsAt}
          onClaim={handleClaim}
          accentColor={accentColor}
          textColor={textColor}
          bgColor={bgColor}
        />
      </div>
    )
  }

  return (
    <div
      ref={dragRef}
      className={ringClass}
      style={{
        background: bg,
        color: fg,
        borderRadius: 10,
        border: `1px solid ${GOLD}40`,
        padding: 20,
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD }}>
          {rewardTeaser || 'Claim Your Reward'}
        </h3>

        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Claims: {builderMode ? '0' : <CountUp value={claimsUsed} />} / {builderMode ? '1' : maxClaims}
        </div>

        {cooldownLeft && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: `${GOLD}15`, color: GOLD, fontSize: 12, fontWeight: 600 }}>
            Cooldown: {cooldownLeft} remaining
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={builderMode || !canClaim || claimMutation.isPending}
          style={{
            padding: '12px 20px',
            borderRadius: 6,
            background: (canClaim || builderMode) ? GOLD : '#3A3F48',
            color: '#0B1220',
            border: 'none',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: (canClaim || builderMode) ? 'pointer' : 'not-allowed',
            opacity: (canClaim || builderMode) && !claimMutation.isPending ? 1 : 0.5,
          }}
        >
          {claimMutation.isPending ? 'Claiming…' : (claimLabel || 'Claim Now')}
        </button>

        {claimMutation.isError && (
          <WidgetError
            detail={claimMutation.error instanceof Error ? claimMutation.error.message : 'Claim failed'}
            onRetry={() => claimMutation.reset()}
          />
        )}
      </div>
    </div>
  )
}

function CashoutSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as CashoutProps }))
  return (
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="CASHOUT" />
      <CapabilityPanel widgetType="CASHOUT" />
      <label className="block text-xs font-medium">Template</label>
      <select value={props.template} onChange={(e) => setProp((p: CashoutProps) => { p.template = e.target.value as CashoutTemplateKey })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="serious">Serious (default)</option>
        <option value="egt_cashback">EGT Cashback (tiered)</option>
      </select>
      <label className="block text-xs font-medium">Reward Teaser</label>
      <input value={props.rewardTeaser} onChange={(e) => setProp((p: CashoutProps) => { p.rewardTeaser = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Claim Button Label</label>
      <input value={props.claimLabel} onChange={(e) => setProp((p: CashoutProps) => { p.claimLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: CashoutProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: CashoutProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: CashoutProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

CashoutWidget.craft = {
  displayName: 'Cashout',
  props: {
    mechanicId: '',
    rewardTeaser: 'Claim Your Reward',
    claimLabel: 'Claim Now',
    template: 'serious' as CashoutTemplateKey,
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: CashoutSettings },
}
