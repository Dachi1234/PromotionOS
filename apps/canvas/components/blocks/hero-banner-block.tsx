'use client'

import { useNode, type UserComponent } from '@craftjs/core'

/**
 * HeroBannerBlock — full-bleed image / gradient banner with a strong
 * overlaid title + tagline + optional CTA. Modelled on operator promo
 * heroes (CrocoBet marathon banners, EGT cashback splashes): dark gradient
 * base ⇒ dramatic photo ⇒ large display-serif title ⇒ subhead with prize
 * teaser.
 *
 * This is the "poster" for a promo page — it doesn't accept children. For
 * compositional panels use PanelFrameBlock instead.
 */

type Alignment = 'left' | 'center' | 'right'
type Overlay = 'dark' | 'gradient' | 'vignette' | 'none'

interface HeroBannerProps {
  imageUrl: string
  title: string
  tagline: string
  eyebrow: string          // small all-caps tag above title, e.g. "WEEKLY PROMO"
  ctaLabel: string
  ctaHref: string
  showCta: boolean
  alignment: Alignment
  overlay: Overlay
  overlayOpacity: number
  accentColor: string
  titleColor: string
  taglineColor: string
  bgColor: string          // fallback solid
  minHeight: number
  titleSize: number
}

export const HeroBannerBlock: UserComponent<HeroBannerProps> = (props) => {
  const {
    imageUrl, title, tagline, eyebrow, ctaLabel, ctaHref, showCta,
    alignment, overlay, overlayOpacity, accentColor, titleColor, taglineColor, bgColor,
    minHeight, titleSize,
  } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))

  const GOLD = accentColor || '#D4AF37'
  const justify = alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start'
  const textAlign = alignment as Alignment

  const bgLayer: React.CSSProperties = imageUrl
    ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bgColor || '#0B1220' }

  const overlayLayer: React.CSSProperties | null = (() => {
    if (overlay === 'none') return null
    const op = Math.max(0, Math.min(100, overlayOpacity)) / 100
    switch (overlay) {
      case 'dark':
        return { background: `rgba(0,0,0,${op})` }
      case 'gradient':
        return {
          background: `linear-gradient(180deg, rgba(0,0,0,${op * 0.2}) 0%, rgba(0,0,0,${op * 0.5}) 45%, rgba(0,0,0,${op}) 100%)`,
        }
      case 'vignette':
        return {
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,${op}) 100%)`,
        }
    }
  })()

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={selected ? 'ring-2 ring-blue-500' : ''}
      style={{
        position: 'relative',
        minHeight,
        overflow: 'hidden',
        borderRadius: 12,
        ...bgLayer,
      }}
    >
      {overlayLayer && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, ...overlayLayer, pointerEvents: 'none' }} />
      )}
      {/* Gold hairline for the poster frame feel */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 12, boxShadow: `inset 0 0 0 1px ${GOLD}50`, pointerEvents: 'none' }} />

      <div
        style={{
          position: 'relative',
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: justify,
          padding: '48px 40px',
          textAlign,
          fontFamily: 'var(--font-display, system-ui)',
        }}
      >
        {eyebrow && (
          <div
            style={{
              color: GOLD,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            color: titleColor || '#FDFBEF',
            fontSize: titleSize,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '0.01em',
            textShadow: '0 3px 18px rgba(0,0,0,0.55)',
            fontFamily: 'var(--font-display, Georgia, serif)',
            maxWidth: '18ch',
          }}
        >
          {title || 'Weekly Prize Pool'}
        </h1>
        {tagline && (
          <p
            style={{
              margin: '14px 0 0 0',
              color: taglineColor || '#D8DEE9',
              fontSize: 16,
              fontWeight: 500,
              maxWidth: '42ch',
              lineHeight: 1.4,
              textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {tagline}
          </p>
        )}
        {showCta && (ctaLabel || 'Enter Promo') && (
          <a
            href={ctaHref || '#'}
            style={{
              marginTop: 24,
              display: 'inline-flex',
              padding: '14px 36px',
              borderRadius: 999,
              background: `linear-gradient(180deg, #F5E19A 0%, ${GOLD} 55%, #7A5A1A 100%)`,
              color: '#0B1220',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: `0 10px 26px -8px ${GOLD}80`,
            }}
          >
            {ctaLabel || 'Enter Promo'}
          </a>
        )}
      </div>
    </div>
  )
}

function HeroBannerSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as HeroBannerProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Image URL</label>
      <input value={props.imageUrl} onChange={(e) => setProp((p: HeroBannerProps) => { p.imageUrl = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="https://…" />
      <label className="block text-xs font-medium">Eyebrow</label>
      <input value={props.eyebrow} onChange={(e) => setProp((p: HeroBannerProps) => { p.eyebrow = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Weekly Promo" />
      <label className="block text-xs font-medium">Title</label>
      <input value={props.title} onChange={(e) => setProp((p: HeroBannerProps) => { p.title = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Tagline</label>
      <textarea value={props.tagline} onChange={(e) => setProp((p: HeroBannerProps) => { p.tagline = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />

      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={props.showCta} onChange={(e) => setProp((p: HeroBannerProps) => { p.showCta = e.target.checked })} /> Show CTA button
      </label>
      {props.showCta && (
        <>
          <label className="block text-xs font-medium">CTA Label</label>
          <input value={props.ctaLabel} onChange={(e) => setProp((p: HeroBannerProps) => { p.ctaLabel = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <label className="block text-xs font-medium">CTA Href</label>
          <input value={props.ctaHref} onChange={(e) => setProp((p: HeroBannerProps) => { p.ctaHref = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        </>
      )}

      <label className="block text-xs font-medium">Alignment</label>
      <select value={props.alignment} onChange={(e) => setProp((p: HeroBannerProps) => { p.alignment = e.target.value as Alignment })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <label className="block text-xs font-medium">Overlay</label>
      <select value={props.overlay} onChange={(e) => setProp((p: HeroBannerProps) => { p.overlay = e.target.value as Overlay })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="gradient">Gradient (bottom)</option>
        <option value="dark">Dark flat</option>
        <option value="vignette">Vignette</option>
        <option value="none">None</option>
      </select>
      <label className="block text-xs font-medium">Overlay Opacity (%)</label>
      <input type="range" min={0} max={100} value={props.overlayOpacity} onChange={(e) => setProp((p: HeroBannerProps) => { p.overlayOpacity = Number(e.target.value) })} className="w-full" />

      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent (gold)</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: HeroBannerProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Title Color</label>
      <input type="color" value={props.titleColor || '#FDFBEF'} onChange={(e) => setProp((p: HeroBannerProps) => { p.titleColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Tagline Color</label>
      <input type="color" value={props.taglineColor || '#D8DEE9'} onChange={(e) => setProp((p: HeroBannerProps) => { p.taglineColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Fallback Bg Color</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: HeroBannerProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />

      <label className="block text-xs font-medium">Min Height (px)</label>
      <input type="number" value={props.minHeight} onChange={(e) => setProp((p: HeroBannerProps) => { p.minHeight = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Title Size (px)</label>
      <input type="number" value={props.titleSize} onChange={(e) => setProp((p: HeroBannerProps) => { p.titleSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  )
}

HeroBannerBlock.craft = {
  displayName: 'Hero Banner',
  props: {
    imageUrl: '',
    title: 'Weekly Prize Pool',
    tagline: 'Join the promo and compete for the top prize. Runs Monday through Sunday.',
    eyebrow: 'Weekly Promo',
    ctaLabel: 'Enter Promo',
    ctaHref: '#',
    showCta: true,
    alignment: 'left' as Alignment,
    overlay: 'gradient' as Overlay,
    overlayOpacity: 70,
    accentColor: '#D4AF37',
    titleColor: '#FDFBEF',
    taglineColor: '#D8DEE9',
    bgColor: '#0B1220',
    minHeight: 380,
    titleSize: 56,
  },
  related: { settings: HeroBannerSettings },
}
