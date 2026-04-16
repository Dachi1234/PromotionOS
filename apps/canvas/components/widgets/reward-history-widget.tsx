'use client'

import { useCallback } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePlayerRewards, useClaimReward } from '@/hooks/use-canvas-data'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, RewardHistoryTemplateProps } from '@/components/templates/shared-types'
import { TrophyCase } from '@/components/templates/reward-history/trophy-case'
import { CleanList } from '@/components/templates/reward-history/clean-list'
import { NeonCollection } from '@/components/templates/reward-history/neon-collection'
import { LuxeRewardHistory } from '@/components/templates/reward-history/luxe-reward-history'
import { WidgetSkeleton, WidgetEmpty, WidgetError } from '@/components/shared/widget-state'

interface RHProps {
  template: TemplateStyle
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

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<RewardHistoryTemplateProps>> = {
  classic: TrophyCase,
  modern: CleanList,
  neon: NeonCollection,
  luxe: LuxeRewardHistory,
  // Reward history skips a dedicated story renderer — Luxe already
  // stacks in a vertical grid that reads well in a 9:16 frame.
  story: LuxeRewardHistory,
}

export const RewardHistoryWidget: UserComponent<RHProps> = (props) => {
  const { template, accentColor, textColor, bgColor } = props
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

  const TemplateComponent = TEMPLATE_MAP[template] || TrophyCase

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

  return (
    <div ref={dragRef} className={ringClass}>
      <TemplateComponent
        rewards={rewards}
        onClaim={handleClaim}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function RHSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RHProps }))
  return (
    <div className="space-y-0">
      <TemplatePicker widgetType="REWARD_HISTORY" />
      <div className="space-y-3 p-3">
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: RHProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: RHProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: RHProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

RewardHistoryWidget.craft = {
  displayName: 'Reward History',
  props: {
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: RHSettings },
}
