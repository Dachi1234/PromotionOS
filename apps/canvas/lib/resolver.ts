import { createElement } from 'react'
import { WidgetErrorBoundary } from '@/components/shared/widget-error-boundary'
import { CanvasRoot } from '@/components/blocks/canvas-root'
import { HeroBlock } from '@/components/blocks/hero-block'
import { RichTextBlock } from '@/components/blocks/rich-text-block'
import { ImageBlock } from '@/components/blocks/image-block'
import { CountdownTimerBlock } from '@/components/blocks/countdown-timer-block'
import { SpacerDividerBlock } from '@/components/blocks/spacer-divider-block'
import { ButtonBlock } from '@/components/blocks/button-block'
import { ColumnsBlock, ColumnDropZone } from '@/components/blocks/columns-block'
import { WheelWidget } from '@/components/widgets/wheel-widget'
import { LeaderboardWidget } from '@/components/widgets/leaderboard-widget'
import { MissionWidget } from '@/components/widgets/mission-widget'
import { ProgressBarWidget } from '@/components/widgets/progress-bar-widget'
import { OptInButtonWidget } from '@/components/widgets/optin-button-widget'
import { RewardHistoryWidget } from '@/components/widgets/reward-history-widget'
import { CashoutWidget } from '@/components/widgets/cashout-widget'

/**
 * Wraps a Craft.js UserComponent with an error boundary while preserving
 * the static `.craft` config that Craft.js requires for drag-and-drop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withErrorBoundary(WrappedComponent: any, displayName: string): any {
  const Wrapped = (props: Record<string, unknown>) =>
    createElement(
      WidgetErrorBoundary,
      { widgetName: displayName },
      createElement(WrappedComponent, props),
    )
  Wrapped.displayName = `ErrorBoundary(${displayName})`
  // Copy Craft.js static config so drag-and-drop, settings panels, and defaults work
  if (WrappedComponent.craft) {
    Wrapped.craft = WrappedComponent.craft
  }
  return Wrapped
}

export const resolver = {
  CanvasRoot,
  HeroBlock,
  RichTextBlock,
  ImageBlock,
  CountdownTimerBlock,
  SpacerDividerBlock,
  ButtonBlock,
  ColumnsBlock,
  ColumnDropZone,
  WheelWidget: withErrorBoundary(WheelWidget, 'Wheel'),
  LeaderboardWidget: withErrorBoundary(LeaderboardWidget, 'Leaderboard'),
  MissionWidget: withErrorBoundary(MissionWidget, 'Mission'),
  ProgressBarWidget: withErrorBoundary(ProgressBarWidget, 'Progress Bar'),
  CashoutWidget: withErrorBoundary(CashoutWidget, 'Cashout'),
  OptInButtonWidget: withErrorBoundary(OptInButtonWidget, 'Opt-In Button'),
  RewardHistoryWidget: withErrorBoundary(RewardHistoryWidget, 'Reward History'),
}
