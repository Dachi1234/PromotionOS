'use client'

import { useState } from 'react'
import { useEditor, Element } from '@craftjs/core'
import { resolver } from '@/lib/resolver'
import { STARTER_LAYOUTS } from '@/lib/starter-layouts'
import { TemplateGallery } from '@/components/builder/template-gallery'
import {
  Type, Image, Timer, Minus, MousePointerClick, Columns3, LayoutGrid,
  Sparkles, Disc, Trophy, Target, BarChart3, UserPlus, Gift, DollarSign,
  Frame, Flag,
  type LucideIcon,
} from 'lucide-react'

type AnyComponent = React.ComponentType<Record<string, unknown>>

interface BlockDef {
  name: string
  desc: string
  icon: LucideIcon
  component: AnyComponent
  canvas?: boolean
}

// Background is no longer a first-class block — the canvas itself owns the
// page background (see CanvasRoot + its settings panel). Per-section bg
// lives inside PanelFrameBlock.
const LAYOUT_BLOCKS: BlockDef[] = [
  { name: 'Hero Banner', desc: 'Full-bleed promo poster', icon: Flag, component: resolver.HeroBannerBlock as unknown as AnyComponent },
  { name: 'Panel Frame', desc: 'Gold-rim container', icon: Frame, component: resolver.PanelFrameBlock as unknown as AnyComponent, canvas: true },
  { name: 'Hero', desc: 'Headline + subhead', icon: LayoutGrid, component: resolver.HeroBlock as unknown as AnyComponent },
  { name: 'Rich Text', desc: 'Paragraph + list', icon: Type, component: resolver.RichTextBlock as unknown as AnyComponent },
  { name: 'Image', desc: 'Uploaded asset', icon: Image, component: resolver.ImageBlock as unknown as AnyComponent },
  { name: 'Countdown', desc: 'Ticker to date', icon: Timer, component: resolver.CountdownTimerBlock as unknown as AnyComponent },
  { name: 'Spacer', desc: 'Breathing room', icon: Minus, component: resolver.SpacerDividerBlock as unknown as AnyComponent },
  { name: 'Button', desc: 'Link or action', icon: MousePointerClick, component: resolver.ButtonBlock as unknown as AnyComponent },
  { name: 'Columns', desc: '2 or 3 columns', icon: Columns3, component: resolver.ColumnsBlock as unknown as AnyComponent, canvas: true },
]

const MECHANIC_WIDGETS: BlockDef[] = [
  { name: 'Wheel', desc: 'Weighted prize wheel', icon: Disc, component: resolver.WheelWidget as unknown as AnyComponent },
  { name: 'Leaderboard', desc: 'Live player ranks', icon: Trophy, component: resolver.LeaderboardWidget as unknown as AnyComponent },
  { name: 'Mission', desc: 'Multi-step challenge', icon: Target, component: resolver.MissionWidget as unknown as AnyComponent },
  { name: 'Progress', desc: 'Toward a goal', icon: BarChart3, component: resolver.ProgressBarWidget as unknown as AnyComponent },
  { name: 'Cashout', desc: 'Claim grand prize', icon: DollarSign, component: resolver.CashoutWidget as unknown as AnyComponent },
  { name: 'Opt-In', desc: 'Enrollment button', icon: UserPlus, component: resolver.OptInButtonWidget as unknown as AnyComponent },
  { name: 'Rewards', desc: 'Past wins list', icon: Gift, component: resolver.RewardHistoryWidget as unknown as AnyComponent },
]

type Tab = 'Layouts' | 'Blocks' | 'Widgets'

export function BlockLibrary() {
  const { connectors, actions, query } = useEditor()
  const [tab, setTab] = useState<Tab>('Widgets')
  const [galleryOpen, setGalleryOpen] = useState(false)

  /** Replace the canvas with a starter layout. Confirm before wiping
   *  in-progress work, and catch deserialize errors so a malformed layout
   *  doesn't kill the builder. */
  const applyStarter = (tree: Record<string, unknown>) => {
    const hasContent = Object.keys(query.getSerializedNodes()).length > 1
    if (hasContent && !window.confirm('This will replace everything on the canvas. Continue?')) {
      return
    }
    try {
      actions.deserialize(JSON.stringify(tree))
    } catch (err) {
      console.error('[starter-layout] deserialize failed', err)
      window.alert('Could not load this starter layout. Check the console for details.')
    }
  }

  return (
    <aside className="builder-leftrail">
      <TemplateGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      <div style={{ padding: 12, borderBottom: '1px solid var(--builder-line)' }}>
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="builder-btn builder-btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 34, fontSize: 12.5 }}
        >
          <Sparkles size={13} /> Browse Template Gallery
        </button>
      </div>
      <div className="builder-leftrail-tabs" role="tablist">
        {(['Layouts', 'Blocks', 'Widgets'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`builder-leftrail-tab${tab === t ? ' active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Layouts' && (
        <div className="builder-leftrail-section">
          <div className="builder-leftrail-section-title">Starter Layouts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STARTER_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => applyStarter(layout.tree)}
                title={layout.description}
                className="builder-tile"
              >
                <div className="builder-tile-icon" aria-hidden>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{layout.icon}</span>
                </div>
                <div className="builder-tile-body">
                  <div className="builder-tile-name">{layout.name}</div>
                  <div className="builder-tile-desc">{layout.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'Blocks' && (
        <div className="builder-leftrail-section">
          <div className="builder-leftrail-section-title">Layout Blocks</div>
          <div className="builder-tile-grid">
            {LAYOUT_BLOCKS.map((block) => {
              const Icon = block.icon
              return (
                <div
                  key={block.name}
                  ref={(ref) => {
                    if (ref) connectors.create(ref, <Element is={block.component} canvas={block.canvas || false} />)
                  }}
                  className="builder-tile"
                  title={block.desc}
                >
                  <div className="builder-tile-icon" aria-hidden>
                    <Icon size={16} />
                  </div>
                  <div className="builder-tile-body">
                    <div className="builder-tile-name">{block.name}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'Widgets' && (
        <div className="builder-leftrail-section">
          <div className="builder-leftrail-section-title">Mechanic Widgets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MECHANIC_WIDGETS.map((widget) => {
              const Icon = widget.icon
              return (
                <div
                  key={widget.name}
                  ref={(ref) => {
                    // Pass `template="classic"` explicitly so a widget dragged
                    // from the left rail renders identically to the same widget
                    // inserted from the Template Gallery's classic card — the
                    // gallery always sets `template`, so without this the two
                    // entry points would produce subtly different defaults.
                    // Only the Wheel widget still uses templates post-cull.
                    // For the Wheel we set 'stadium' (the serious default);
                    // every other widget ignores the prop.
                    if (ref) connectors.create(ref, <Element is={widget.component} template="stadium" />)
                  }}
                  className="builder-tile"
                  title={widget.desc}
                >
                  <div className="builder-tile-icon" aria-hidden>
                    <Icon size={16} />
                  </div>
                  <div className="builder-tile-body">
                    <div className="builder-tile-name">{widget.name}</div>
                    <div className="builder-tile-desc">{widget.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
