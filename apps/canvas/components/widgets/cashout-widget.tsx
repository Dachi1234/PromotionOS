'use client'

import { useCallback, useState, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerState, useCashoutClaim } from '@/hooks/use-canvas-data'
import { MechanicPicker } from '@/components/builder/mechanic-picker'

interface CashoutProps {
  mechanicId: string
  rewardTeaser: string
  claimLabel: string
  accentColor: string
  textColor: string
  bgColor: string
}

export const CashoutWidget: UserComponent<CashoutProps> = (props) => {
  const { mechanicId, rewardTeaser, claimLabel, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, campaignSlug } = useCanvasStore()
  const { data: playerState } = usePlayerState(isBuilder ? null : campaignSlug)
  const claimMutation = useCashoutClaim(mechanicId)

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
    claimMutation.mutate()
  }, [isBuilder, canClaim, claimMutation])

  const builderMode = isBuilder

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={selected ? 'ring-2 ring-blue-500' : ''}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="rounded-xl p-5 space-y-4">
        <h3 className="text-lg font-bold" style={{ color: accentColor }}>
          {rewardTeaser || 'Claim Your Reward'}
        </h3>

        <div className="text-sm opacity-80">
          Claims: {builderMode ? '0' : claimsUsed} / {builderMode ? '1' : maxClaims}
        </div>

        {cooldownLeft && (
          <div className="rounded-md bg-amber-500/20 px-3 py-2 text-sm text-amber-300">
            Cooldown: {cooldownLeft} remaining
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={builderMode || !canClaim || claimMutation.isPending}
          className="w-full rounded-lg px-4 py-3 text-sm font-bold transition-all disabled:opacity-50"
          style={{
            backgroundColor: canClaim || builderMode ? accentColor : '#555',
            color: '#fff',
          }}
        >
          {claimMutation.isPending ? 'Claiming…' : (claimLabel || 'Claim Now')}
        </button>

        {claimMutation.isError && (
          <div className="rounded bg-red-900/80 px-3 py-2 text-center text-xs text-red-200">
            {claimMutation.error instanceof Error ? claimMutation.error.message : 'Claim failed'}
          </div>
        )}
      </div>
    </div>
  )
}

function CashoutSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as CashoutProps }))
  return (
    <div className="space-y-0">
      <div className="space-y-3 p-3">
        <MechanicPicker widgetType="CASHOUT" />
        <label className="block text-xs font-medium">Reward Teaser</label>
        <input value={props.rewardTeaser} onChange={(e) => setProp((p: CashoutProps) => { p.rewardTeaser = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Claim Button Label</label>
        <input value={props.claimLabel} onChange={(e) => setProp((p: CashoutProps) => { p.claimLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#22c55e'} onChange={(e) => setProp((p: CashoutProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: CashoutProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: CashoutProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

CashoutWidget.craft = {
  displayName: 'Cashout',
  props: {
    mechanicId: '',
    rewardTeaser: 'Claim Your Reward',
    claimLabel: 'Claim Now',
    accentColor: '#22c55e',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: CashoutSettings },
}
