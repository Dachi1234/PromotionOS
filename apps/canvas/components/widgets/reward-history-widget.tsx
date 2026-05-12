'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerRewards, useClaimReward } from '@/hooks/use-canvas-data'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { RewardHistoryTemplateProps } from '@/components/templates/shared-types'
import { WidgetSkeleton, WidgetEmpty, WidgetError } from '@/components/shared/widget-state'

interface RHProps {
  accentColor: string
  textColor: string
  bgColor: string
}

const SAMPLE_REWARDS: RewardHistoryTemplateProps['rewards'] = [
  { id: '1', type: 'FREE_SPINS', label: 'Free Spins', amount: 10, status: 'fulfilled', date: '2024-01-15' },
  { id: '2', type: 'CASH', label: 'Cash Bonus', amount: 50, status: 'pending', date: '2024-01-16' },
  { id: '3', type: 'CASHBACK', label: 'Cashback', amount: 25, status: 'claimable', date: '2024-01-17' },
  { id: '4', type: 'FREE_BET', label: 'Free Bet', amount: 5, status: 'expired', date: '2024-01-10' },
  { id: '5', type: 'BONUS', label: 'Deposit Bonus', amount: 100, status: 'fulfilled', date: '2024-01-08' },
]

function mapRewardStatus(status: string): 'fulfilled' | 'pending' | 'claimable' | 'expired' {
  switch (status) {
    case 'fulfilled': return 'fulfilled'
    case 'pending': return 'claimable'
    case 'condition_pending': return 'pending'
    case 'expired':
    case 'forfeited': return 'expired'
    default: return 'pending'
  }
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  fulfilled: { label: 'Fulfilled', color: '#64D48A' },
  claimable: { label: 'Claim', color: '#D4AF37' },
  pending:   { label: 'Pending',  color: '#9FB3C8' },
  expired:   { label: 'Expired',  color: '#7A5A5A' },
}

export const RewardHistoryWidget: UserComponent<RHProps> = (props) => {
  const { accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, campaignSlug } = useCanvasStore()
  const { data: rewardsData, isLoading, error } = usePlayerRewards(isBuilder ? null : campaignSlug)
  const claimMutation = useClaimReward()

  const apiRewards: RewardHistoryTemplateProps['rewards'] = (rewardsData?.rewards ?? []).map((r) => {
    const config = r.config ?? {}
    return {
      id: r.id,
      type: r.type ?? 'CASH',
      label: (config.label as string) ?? r.type ?? 'Reward',
      amount: (config.amount as number) ?? r.amount ?? 0,
      status: mapRewardStatus(r.status),
      date: r.grantedAt ? new Date(r.grantedAt).toLocaleDateString() : '',
    }
  })

  const rewards = isBuilder ? SAMPLE_REWARDS : apiRewards

  const handleClaim = useCallback((rewardId: string) => {
    if (isBuilder) return
    claimMutation.mutate(rewardId)
  }, [isBuilder, claimMutation])

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  if (!isBuilder) {
    if (isLoading && rewards.length === 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetSkeleton lines={4} />
        </div>
      )
    }
    if (error) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetError
            detail={error instanceof Error ? error.message : 'Failed to load rewards'}
          />
        </div>
      )
    }
    if (rewards.length === 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetEmpty
            title="No rewards yet"
            description="Your prize shelf is empty for now. Play the mechanics above and your wins will appear here."
          />
        </div>
      )
    }
  }

  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'

  return (
    <div
      ref={dragRef}
      className={ringClass}
      style={{
        background: bg, color: fg,
        borderRadius: 10,
        border: `1px solid ${GOLD}40`,
        overflow: 'hidden',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div
        style={{
          padding: '12px 18px',
          borderBottom: `1px solid ${GOLD}25`,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: GOLD,
        }}
      >
        Reward History
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rewards.map((r) => {
          const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending!
          return (
            <li
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                borderTop: `1px solid ${GOLD}12`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{r.date}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: GOLD }}>
                {r.amount > 0 ? `+${r.amount}` : ''}
              </div>
              {r.status === 'claimable' ? (
                <button
                  type="button"
                  onClick={() => handleClaim(r.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 4,
                    background: GOLD, color: '#0B1220',
                    border: 'none', fontWeight: 800, fontSize: 10,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Claim
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: s.color,
                    opacity: 0.85,
                  }}
                >
                  {s.label}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RHSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RHProps }))
  return (
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="REWARD_HISTORY" />
      <CapabilityPanel widgetType="REWARD_HISTORY" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: RHProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: RHProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: RHProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

RewardHistoryWidget.craft = {
  displayName: 'Reward History',
  props: {
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: RHSettings },
}
