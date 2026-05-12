'use client'

import type { ReactNode } from 'react'
import { useNode, useEditor, Element, type UserComponent } from '@craftjs/core'
import { ResizableWrapper } from '@/components/builder/resizable-wrapper'

interface BackgroundProps {
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage: string
  overlayColor: string
  overlayOpacity: number
  minHeight: number
  padding: number
  children?: ReactNode
}

/**
 * General-purpose background container. Any content (other blocks, widgets)
 * can be dropped inside. Exposes color / gradient / image background with an
 * optional darkening overlay — the go-to block for hero sections, "about"
 * panels, or full-bleed promo backdrops.
 *
 * Marked `canvas` via the resolver's Element usage so Craft.js treats it as a
 * drop target, not just a leaf.
 */
export const BackgroundBlock: UserComponent<BackgroundProps> = ({
  bgType, bgColor, bgGradient, bgImage,
  overlayColor, overlayOpacity, minHeight, padding, children,
}) => {
  // Whether this background has any child nodes. Empty backgrounds show a
  // clear "drop content here" affordance so it's obvious they're a wrapping
  // section, not a one-off image block.
  const { hasChildren, isSelected } = useNode((n) => ({
    hasChildren: (n.data.nodes?.length ?? 0) > 0,
    isSelected: n.events.selected,
  }))
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }))

  const bgStyle: React.CSSProperties =
    bgType === 'gradient' ? { background: bgGradient }
    : bgType === 'image' ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: bgColor }

  return (
    <ResizableWrapper
      className="relative overflow-hidden"
      style={{ ...bgStyle, minHeight, padding, width: '100%' }}
    >
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlayColor, opacity: overlayOpacity / 100 }}
          aria-hidden
        />
      )}
      <div
        className="relative"
        style={{
          zIndex: 1,
          minHeight: Math.max(80, minHeight - padding * 2),
          display: hasChildren ? 'block' : 'grid',
          placeItems: hasChildren ? undefined : 'center',
        }}
      >
        {hasChildren ? children : (
          enabled ? (
            <div
              style={{
                border: '2px dashed rgba(255,255,255,0.45)',
                borderRadius: 10,
                padding: '28px 36px',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontWeight: 500,
                textAlign: 'center',
                background: 'rgba(0,0,0,0.15)',
                backdropFilter: 'blur(2px)',
                maxWidth: 320,
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: 4 }}>
                Background Section
              </div>
              Drop any block or widget here — it will render on top of this background.
              {isSelected && (
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                  Adjust colors, size, and padding in the right panel.
                </div>
              )}
            </div>
          ) : null
        )}
      </div>
    </ResizableWrapper>
  )
}

// Marks the children region as a Craft.js canvas so drops actually land
// inside. Without this, Craft treats the background as a leaf and items
// dropped on top get routed to the parent instead.
void Element


function BackgroundSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as BackgroundProps }))

  const row = (label: string, control: ReactNode) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--builder-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {control}
    </div>
  )
  const input: React.CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: 12,
    border: '1px solid var(--builder-line-2)', borderRadius: 6, background: 'var(--builder-surface)',
    color: 'var(--builder-ink)', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: 14 }}>
      {row('Background Type',
        <select value={props.bgType} onChange={(e) => setProp((p: BackgroundProps) => { p.bgType = e.target.value as BackgroundProps['bgType'] })} style={input}>
          <option value="color">Solid Color</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
        </select>
      )}
      {props.bgType === 'color' && row('Color',
        <input type="color" value={props.bgColor} onChange={(e) => setProp((p: BackgroundProps) => { p.bgColor = e.target.value })} style={{ ...input, height: 32, padding: 2 }} />
      )}
      {props.bgType === 'gradient' && row('CSS Gradient',
        <input type="text" value={props.bgGradient} onChange={(e) => setProp((p: BackgroundProps) => { p.bgGradient = e.target.value })} style={input} placeholder="linear-gradient(135deg, #7c3aed, #ec4899)" />
      )}
      {props.bgType === 'image' && row('Image URL',
        <input type="text" value={props.bgImage} onChange={(e) => setProp((p: BackgroundProps) => { p.bgImage = e.target.value })} style={input} placeholder="https://…" />
      )}
      {row('Overlay Color',
        <input type="color" value={props.overlayColor} onChange={(e) => setProp((p: BackgroundProps) => { p.overlayColor = e.target.value })} style={{ ...input, height: 32, padding: 2 }} />
      )}
      {row(`Overlay Opacity · ${props.overlayOpacity}%`,
        <input type="range" min={0} max={100} value={props.overlayOpacity} onChange={(e) => setProp((p: BackgroundProps) => { p.overlayOpacity = Number(e.target.value) })} style={{ width: '100%' }} />
      )}
      {row(`Min Height · ${props.minHeight}px`,
        <input type="range" min={80} max={900} value={props.minHeight} onChange={(e) => setProp((p: BackgroundProps) => { p.minHeight = Number(e.target.value) })} style={{ width: '100%' }} />
      )}
      {row(`Padding · ${props.padding}px`,
        <input type="range" min={0} max={120} value={props.padding} onChange={(e) => setProp((p: BackgroundProps) => { p.padding = Number(e.target.value) })} style={{ width: '100%' }} />
      )}
    </div>
  )
}

BackgroundBlock.craft = {
  displayName: 'Background',
  props: {
    bgType: 'gradient',
    bgColor: '#111827',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    bgImage: '',
    overlayColor: '#000000',
    overlayOpacity: 0,
    minHeight: 520,
    padding: 40,
  },
  rules: { canMoveIn: () => true },
  related: { settings: BackgroundSettings },
}
