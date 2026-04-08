'use client'

import { useEditor, Element } from '@craftjs/core'
import { HeroBlock } from '@/components/blocks/hero-block'
import { RichTextBlock } from '@/components/blocks/rich-text-block'
import { ImageBlock } from '@/components/blocks/image-block'
import { CountdownTimerBlock } from '@/components/blocks/countdown-timer-block'
import { SpacerDividerBlock } from '@/components/blocks/spacer-divider-block'
import { ButtonBlock } from '@/components/blocks/button-block'
import { ColumnsBlock } from '@/components/blocks/columns-block'
import { WheelWidget } from '@/components/widgets/wheel-widget'
import { LeaderboardWidget } from '@/components/widgets/leaderboard-widget'
import { MissionWidget } from '@/components/widgets/mission-widget'
import { ProgressBarWidget } from '@/components/widgets/progress-bar-widget'
import { OptInButtonWidget } from '@/components/widgets/optin-button-widget'
import { RewardHistoryWidget } from '@/components/widgets/reward-history-widget'
import { CashoutWidget } from '@/components/widgets/cashout-widget'
import {
  Type, Image, Timer, Minus, MousePointerClick, Columns3, LayoutGrid,
  Disc, Trophy, Target, BarChart3, UserPlus, Gift, DollarSign,
} from 'lucide-react'

type AnyComponent = React.ComponentType<Record<string, unknown>>

const LAYOUT_BLOCKS = [
  { name: 'Hero', icon: LayoutGrid, component: HeroBlock as unknown as AnyComponent },
  { name: 'Rich Text', icon: Type, component: RichTextBlock as unknown as AnyComponent },
  { name: 'Image', icon: Image, component: ImageBlock as unknown as AnyComponent },
  { name: 'Countdown', icon: Timer, component: CountdownTimerBlock as unknown as AnyComponent },
  { name: 'Spacer', icon: Minus, component: SpacerDividerBlock as unknown as AnyComponent },
  { name: 'Button', icon: MousePointerClick, component: ButtonBlock as unknown as AnyComponent },
  { name: 'Columns', icon: Columns3, component: ColumnsBlock as unknown as AnyComponent, canvas: true },
]

const MECHANIC_WIDGETS = [
  { name: 'Wheel', icon: Disc, component: WheelWidget as unknown as AnyComponent },
  { name: 'Leaderboard', icon: Trophy, component: LeaderboardWidget as unknown as AnyComponent },
  { name: 'Mission', icon: Target, component: MissionWidget as unknown as AnyComponent },
  { name: 'Progress Bar', icon: BarChart3, component: ProgressBarWidget as unknown as AnyComponent },
  { name: 'Cashout', icon: DollarSign, component: CashoutWidget as unknown as AnyComponent },
  { name: 'Opt-In', icon: UserPlus, component: OptInButtonWidget as unknown as AnyComponent },
  { name: 'Rewards', icon: Gift, component: RewardHistoryWidget as unknown as AnyComponent },
]

export function BlockLibrary() {
  const { connectors } = useEditor()

  return (
    <div className="w-56 border-r border-border bg-card h-full overflow-y-auto p-3 space-y-4">
      <div>
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground mb-2 px-1">Layout</h3>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_BLOCKS.map((block) => {
            const Icon = block.icon
            return (
              <div
                key={block.name}
                ref={(ref) => { if (ref) connectors.create(ref, <Element is={block.component} canvas={block.canvas || false} />) }}
                className="flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-background p-3 text-center cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{block.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground mb-2 px-1">Widgets</h3>
        <div className="grid grid-cols-2 gap-2">
          {MECHANIC_WIDGETS.map((widget) => {
            const Icon = widget.icon
            return (
              <div
                key={widget.name}
                ref={(ref) => { if (ref) connectors.create(ref, <Element is={widget.component} />) }}
                className="flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-background p-3 text-center cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{widget.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
