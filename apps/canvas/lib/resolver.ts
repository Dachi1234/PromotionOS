import { createElement } from 'react'
import { WidgetErrorBoundary } from '@/components/shared/widget-error-boundary'
import { ResizableWrapper } from '@/components/builder/resizable-wrapper'
import { withFreeForm } from '@/components/builder/free-form'
import { CanvasRoot } from '@/components/blocks/canvas-root'
import { HeroBlock } from '@/components/blocks/hero-block'
import { RichTextBlock } from '@/components/blocks/rich-text-block'
import { ImageBlock } from '@/components/blocks/image-block'
import { CountdownTimerBlock } from '@/components/blocks/countdown-timer-block'
import { SpacerDividerBlock } from '@/components/blocks/spacer-divider-block'
import { ButtonBlock } from '@/components/blocks/button-block'
import { ColumnsBlock, ColumnDropZone } from '@/components/blocks/columns-block'
import { BackgroundBlock } from '@/components/blocks/background-block'
import { PanelFrameBlock } from '@/components/blocks/panel-frame-block'
import { HeroBannerBlock } from '@/components/blocks/hero-banner-block'
import { WheelWidget } from '@/components/widgets/wheel-widget'
import { LeaderboardWidget } from '@/components/widgets/leaderboard-widget'
import { MissionWidget } from '@/components/widgets/mission-widget'
import { ProgressBarWidget } from '@/components/widgets/progress-bar-widget'
import { OptInButtonWidget } from '@/components/widgets/optin-button-widget'
import { RewardHistoryWidget } from '@/components/widgets/reward-history-widget'
import { CashoutWidget } from '@/components/widgets/cashout-widget'

/**
 * Wraps a Craft.js UserComponent with:
 *   1. WidgetErrorBoundary — one flaky widget never crashes the canvas.
 *   2. ResizableWrapper (bindConnectors=false) — gives every widget the
 *      same selected-state outline, drag-to-resize handles, and the
 *      `_w` / `_h` / `_mt` size props as blocks. Widgets keep their own
 *      inner connect+drag wiring, so we don't re-bind Craft.js
 *      connectors at the outer level.
 *
 * Preserves the original component's static `.craft` config so Craft.js's
 * drag-and-drop, settings panel, and defaults all keep working.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withWidgetChrome(WrappedComponent: any, displayName: string): any {
  const Wrapped = (props: Record<string, unknown>) =>
    createElement(
      ResizableWrapper,
      { bindConnectors: false },
      createElement(
        WidgetErrorBoundary,
        { widgetName: displayName },
        createElement(WrappedComponent, props),
      ),
    )
  Wrapped.displayName = `WidgetChrome(${displayName})`
  if (WrappedComponent.craft) {
    Wrapped.craft = WrappedComponent.craft
  }
  return Wrapped
}

export const resolver = {
  CanvasRoot,
  // Blocks that render their own root div get wrapped with `withFreeForm` so
  // they can be dragged pixel-accurately when the user toggles Free Position.
  // Blocks that already use `ResizableWrapper` (ImageBlock, BackgroundBlock)
  // have free-form built-in, and container-internals (ColumnDropZone,
  // CanvasRoot) stay flow-only.
  HeroBlock: withFreeForm(HeroBlock, 'Hero'),
  RichTextBlock: withFreeForm(RichTextBlock, 'Rich Text'),
  ImageBlock,
  CountdownTimerBlock: withFreeForm(CountdownTimerBlock, 'Countdown'),
  SpacerDividerBlock: withFreeForm(SpacerDividerBlock, 'Spacer / Divider'),
  ButtonBlock: withFreeForm(ButtonBlock, 'Button'),
  ColumnsBlock: withFreeForm(ColumnsBlock, 'Columns'),
  ColumnDropZone,
  BackgroundBlock,
  PanelFrameBlock: withFreeForm(PanelFrameBlock, 'Panel'),
  HeroBannerBlock: withFreeForm(HeroBannerBlock, 'Hero Banner'),
  WheelWidget: withWidgetChrome(WheelWidget, 'Wheel'),
  LeaderboardWidget: withWidgetChrome(LeaderboardWidget, 'Leaderboard'),
  MissionWidget: withWidgetChrome(MissionWidget, 'Mission'),
  ProgressBarWidget: withWidgetChrome(ProgressBarWidget, 'Progress Bar'),
  CashoutWidget: withWidgetChrome(CashoutWidget, 'Cashout'),
  OptInButtonWidget: withWidgetChrome(OptInButtonWidget, 'Opt-In Button'),
  RewardHistoryWidget: withWidgetChrome(RewardHistoryWidget, 'Reward History'),
}
