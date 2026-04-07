'use client'

import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'

interface HeroProps {
  headline: string
  subtitle: string
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage: string
  alignment: 'left' | 'center' | 'right'
  overlayOpacity: number
  minHeight: number
  padding: number
  headlineFontSize: number
}

export const HeroBlock: UserComponent<HeroProps> = ({
  headline, subtitle, bgType, bgColor, bgGradient, bgImage,
  alignment, overlayOpacity, minHeight, padding, headlineFontSize,
}) => {
  const { connectors: { connect, drag }, selected } = useNode((node) => ({ selected: node.events.selected }))
  const theme = useCanvasStore((s) => s.theme)

  const bgStyle: React.CSSProperties = bgType === 'gradient'
    ? { background: bgGradient || `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }
    : bgType === 'image'
      ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bgColor || theme.primaryColor }

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={`relative overflow-hidden ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ ...bgStyle, minHeight, padding, textAlign: alignment }}
    >
      {bgType === 'image' && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />
      )}
      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 style={{ fontSize: headlineFontSize, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {headline || 'Campaign Headline'}
        </h1>
        {subtitle && <p style={{ fontSize: headlineFontSize * 0.5, color: 'rgba(255,255,255,0.85)' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

function HeroSettings() {
  const { actions: { setProp }, props } = useNode((node) => ({ props: node.data.props as HeroProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Headline</label>
      <input value={props.headline} onChange={(e) => setProp((p: HeroProps) => { p.headline = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Subtitle</label>
      <input value={props.subtitle} onChange={(e) => setProp((p: HeroProps) => { p.subtitle = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Background Type</label>
      <select value={props.bgType} onChange={(e) => setProp((p: HeroProps) => { p.bgType = e.target.value as HeroProps['bgType'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="color">Solid Color</option>
        <option value="gradient">Gradient</option>
        <option value="image">Image</option>
      </select>
      {props.bgType === 'color' && (
        <>
          <label className="block text-xs font-medium">Background Color</label>
          <input type="color" value={props.bgColor} onChange={(e) => setProp((p: HeroProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
        </>
      )}
      {props.bgType === 'image' && (
        <>
          <label className="block text-xs font-medium">Image URL</label>
          <input value={props.bgImage} onChange={(e) => setProp((p: HeroProps) => { p.bgImage = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <label className="block text-xs font-medium">Overlay Opacity (%)</label>
          <input type="range" min={0} max={100} value={props.overlayOpacity} onChange={(e) => setProp((p: HeroProps) => { p.overlayOpacity = Number(e.target.value) })} className="w-full" />
        </>
      )}
      <label className="block text-xs font-medium">Alignment</label>
      <select value={props.alignment} onChange={(e) => setProp((p: HeroProps) => { p.alignment = e.target.value as HeroProps['alignment'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <label className="block text-xs font-medium">Min Height (px)</label>
      <input type="number" value={props.minHeight} onChange={(e) => setProp((p: HeroProps) => { p.minHeight = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Font Size (px)</label>
      <input type="number" value={props.headlineFontSize} onChange={(e) => setProp((p: HeroProps) => { p.headlineFontSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  )
}

HeroBlock.craft = {
  displayName: 'Hero',
  props: {
    headline: 'Campaign Headline', subtitle: 'Join now and win amazing prizes!',
    bgType: 'gradient', bgColor: '#7c3aed', bgGradient: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    bgImage: '', alignment: 'center', overlayOpacity: 40, minHeight: 300, padding: 48, headlineFontSize: 42,
  },
  related: { settings: HeroSettings },
}
