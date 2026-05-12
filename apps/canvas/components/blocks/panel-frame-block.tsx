'use client'

import { useNode, Element, type UserComponent } from '@craftjs/core'

/**
 * PanelFrameBlock — decorative container matching the serious promo look.
 * A solid tinted background panel wrapped in a double-ring border: an outer
 * hairline + an inner polished-metal rim. Children drop inside the inner
 * padded region. Use this to group a hero + widget + CTA as a single
 * "casino panel" unit instead of floating widgets on raw background.
 *
 * Variants:
 *   - `gold`  — brass rim on deep navy. Default.
 *   - `green` — same rim on emerald baize. Pairs with CasinoVIPWheel.
 *   - `crimson` — velvet-red backing with gold. Jackpot panel.
 *   - `custom` — user-driven `accent` + `bg` colors.
 */

type FrameVariant = 'gold' | 'green' | 'crimson' | 'custom'

interface PanelFrameProps {
  variant: FrameVariant
  accent: string
  bg: string
  radius: number
  padding: number
  minHeight: number
  title: string
}

const PRESETS: Record<Exclude<FrameVariant, 'custom'>, { accent: string; bg: string }> = {
  gold:    { accent: '#D4AF37', bg: '#0B1220' },
  green:   { accent: '#D4AF37', bg: '#063720' },
  crimson: { accent: '#C9A24B', bg: '#2A0B0B' },
}

export const PanelFrameBlock: UserComponent<React.PropsWithChildren<PanelFrameProps>> = ({
  variant, accent, bg, radius, padding, minHeight, title, children,
}) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))

  const resolved = variant === 'custom'
    ? { accent: accent || '#D4AF37', bg: bg || '#0B1220' }
    : PRESETS[variant]

  const GOLD = resolved.accent
  const GOLD_DARK = shade(GOLD, -35)
  const GOLD_BRIGHT = shade(GOLD, 30)

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={selected ? 'ring-2 ring-blue-500' : ''}
      style={{
        position: 'relative',
        background: resolved.bg,
        borderRadius: radius,
        padding: 6, // space for the outer rim
        minHeight,
      }}
    >
      {/* Outer metallic rim — conic gradient mimics polished brass */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          borderRadius: radius,
          padding: 2,
          background: `conic-gradient(from 220deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD}, ${GOLD_DARK}, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD}, ${GOLD_DARK})`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
      />
      {/* Inner hairline */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 6,
          borderRadius: Math.max(0, radius - 4),
          border: `1px solid ${GOLD}55`,
          pointerEvents: 'none',
        }}
      />
      {/* Subtle inset glow so the panel reads as recessed */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 6,
          borderRadius: Math.max(0, radius - 4),
          boxShadow: `inset 0 0 40px ${GOLD}12, inset 0 0 0 1px rgba(0,0,0,0.5)`,
          pointerEvents: 'none',
        }}
      />

      {title && (
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD,
            padding: '14px 16px 0 16px',
          }}
        >
          {title}
        </div>
      )}

      <div style={{ position: 'relative', padding }}>
        <Element id="panel-frame-content" is="div" canvas>
          {children}
        </Element>
      </div>
    </div>
  )
}

function PanelFrameSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as PanelFrameProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Title</label>
      <input value={props.title} onChange={(e) => setProp((p: PanelFrameProps) => { p.title = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Variant</label>
      <select value={props.variant} onChange={(e) => setProp((p: PanelFrameProps) => { p.variant = e.target.value as FrameVariant })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="gold">Gold on Navy</option>
        <option value="green">Gold on Emerald</option>
        <option value="crimson">Gold on Crimson</option>
        <option value="custom">Custom</option>
      </select>
      {props.variant === 'custom' && (
        <>
          <label className="block text-xs font-medium">Accent (rim)</label>
          <input type="color" value={props.accent || '#D4AF37'} onChange={(e) => setProp((p: PanelFrameProps) => { p.accent = e.target.value })} className="h-8 w-full" />
          <label className="block text-xs font-medium">Background</label>
          <input type="color" value={props.bg || '#0B1220'} onChange={(e) => setProp((p: PanelFrameProps) => { p.bg = e.target.value })} className="h-8 w-full" />
        </>
      )}
      <label className="block text-xs font-medium">Radius (px)</label>
      <input type="number" value={props.radius} onChange={(e) => setProp((p: PanelFrameProps) => { p.radius = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Padding (px)</label>
      <input type="number" value={props.padding} onChange={(e) => setProp((p: PanelFrameProps) => { p.padding = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Min Height (px)</label>
      <input type="number" value={props.minHeight} onChange={(e) => setProp((p: PanelFrameProps) => { p.minHeight = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  )
}

PanelFrameBlock.craft = {
  displayName: 'Panel Frame',
  props: {
    variant: 'gold' as FrameVariant,
    accent: '#D4AF37',
    bg: '#0B1220',
    radius: 16,
    padding: 24,
    minHeight: 200,
    title: '',
  },
  rules: {
    canMoveIn: () => true,
  },
  related: { settings: PanelFrameSettings },
}

/** Shift a hex color by `amount` (-100..100). Quick/dirty shade util. */
function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const factor = 1 + amount / 100
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)))
  const to = (v: number) => clamp(v).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
