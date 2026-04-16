'use client'

import { useNode } from '@craftjs/core'
import { Check } from 'lucide-react'
import type { TemplateStyle } from '@/components/templates/shared-types'

interface TemplateOption {
  id: TemplateStyle
  name: string
  description: string
  preview: React.ReactNode
}

const TEMPLATE_FAMILIES: Record<string, TemplateOption[]> = {
  WHEEL: [
    { id: 'classic', name: 'Classic Casino', description: 'Traditional gold & dark theme', preview: <WheelThumb variant="classic" /> },
    { id: 'modern', name: 'Modern Minimal', description: 'Clean, flat, contemporary', preview: <WheelThumb variant="modern" /> },
    { id: 'neon', name: 'Neon Arcade', description: 'Bold neon glow effects', preview: <WheelThumb variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Follows the active theme tokens', preview: <WheelThumb variant="luxe" /> },
    { id: 'story', name: 'Story Mode', description: '9:16 vertical full-bleed', preview: <StoryThumb label="◯" /> },
  ],
  LEADERBOARD: [
    { id: 'classic', name: 'Podium', description: 'Top 3 podium + table', preview: <GenericThumb label="🏆" variant="classic" /> },
    { id: 'modern', name: 'Card Stack', description: 'Stacked card layout', preview: <GenericThumb label="📊" variant="modern" /> },
    { id: 'neon', name: 'Neon Scoreboard', description: 'Retro arcade scores', preview: <GenericThumb label="🕹" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven glass card', preview: <GenericThumb label="✦" variant="luxe" /> },
    { id: 'story', name: 'Story Mode', description: '9:16 vertical podium + tail', preview: <StoryThumb label="🏆" /> },
  ],
  MISSION: [
    { id: 'classic', name: 'Quest Map', description: 'Fantasy path with waypoints', preview: <GenericThumb label="🗺" variant="classic" /> },
    { id: 'modern', name: 'Checklist', description: 'Clean task cards', preview: <GenericThumb label="✅" variant="modern" /> },
    { id: 'neon', name: 'Neon Track', description: 'Sci-fi progress track', preview: <GenericThumb label="⚡" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven stepper', preview: <GenericThumb label="✦" variant="luxe" /> },
  ],
  PROGRESS_BAR: [
    { id: 'classic', name: 'Treasure Fill', description: 'Animated liquid jar', preview: <GenericThumb label="🏺" variant="classic" /> },
    { id: 'modern', name: 'Clean Bar', description: 'Minimal progress bar', preview: <GenericThumb label="📈" variant="modern" /> },
    { id: 'neon', name: 'Power Meter', description: 'VU meter with neon bars', preview: <GenericThumb label="🔋" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven meter + win flip', preview: <GenericThumb label="✦" variant="luxe" /> },
    { id: 'story', name: 'Story Mode', description: '9:16 vertical column fill', preview: <StoryThumb label="📈" /> },
  ],
  CASHOUT: [
    { id: 'classic', name: 'Vault Door', description: 'Combination lock vault', preview: <GenericThumb label="🔐" variant="classic" /> },
    { id: 'modern', name: 'Claim Card', description: 'Clean checklist card', preview: <GenericThumb label="💳" variant="modern" /> },
    { id: 'neon', name: 'Neon Unlock', description: 'Digital lock with rings', preview: <GenericThumb label="🔓" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven ticket card', preview: <GenericThumb label="✦" variant="luxe" /> },
  ],
  REWARD_HISTORY: [
    { id: 'classic', name: 'Trophy Case', description: 'Shelf display case', preview: <GenericThumb label="🏅" variant="classic" /> },
    { id: 'modern', name: 'Clean List', description: 'Filterable list view', preview: <GenericThumb label="📋" variant="modern" /> },
    { id: 'neon', name: 'Neon Collection', description: 'Glowing icon grid', preview: <GenericThumb label="✨" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven grid of tiles', preview: <GenericThumb label="✦" variant="luxe" /> },
  ],
  OPT_IN: [
    { id: 'classic', name: 'Classic CTA', description: '3D gradient button', preview: <GenericThumb label="🎯" variant="classic" /> },
    { id: 'modern', name: 'Clean Pill', description: 'Minimal pill button', preview: <GenericThumb label="💊" variant="modern" /> },
    { id: 'neon', name: 'Neon Pulse', description: 'Pulsing neon button', preview: <GenericThumb label="💡" variant="neon" /> },
    { id: 'luxe', name: 'Luxe (Themed)', description: 'Theme-driven glow CTA', preview: <GenericThumb label="✦" variant="luxe" /> },
    { id: 'story', name: 'Story Mode', description: '9:16 hero CTA screen', preview: <StoryThumb label="🎯" /> },
  ],
  COUNTDOWN: [
    { id: 'classic', name: 'Flip Clock', description: 'Split-flap digits', preview: <GenericThumb label="⏰" variant="classic" /> },
    { id: 'modern', name: 'Clean Digits', description: 'Large bold numbers', preview: <GenericThumb label="🔢" variant="modern" /> },
    { id: 'neon', name: 'Neon Timer', description: 'LED segment display', preview: <GenericThumb label="⏱" variant="neon" /> },
  ],
}

function WheelThumb({ variant }: { variant: TemplateStyle }) {
  // `luxe` thumbnails render with live theme tokens so operators see what
  // the active theme will actually paint. Other variants stay on their
  // canonical palettes.
  if (variant === 'luxe') {
    const tokenColors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))',
      'hsl(var(--accent))',
      'hsl(var(--win))',
    ]
    return (
      <div
        className="w-full aspect-[4/3] rounded-md flex items-center justify-center bg-gradient-hero"
      >
        <svg viewBox="0 0 80 80" className="w-14 h-14">
          {tokenColors.map((color, i) => {
            const angle = (360 / tokenColors.length) * i - 90
            const endAngle = angle + 360 / tokenColors.length
            const r = 35
            const x1 = 40 + r * Math.cos(angle * Math.PI / 180)
            const y1 = 40 + r * Math.sin(angle * Math.PI / 180)
            const x2 = 40 + r * Math.cos(endAngle * Math.PI / 180)
            const y2 = 40 + r * Math.sin(endAngle * Math.PI / 180)
            return <path key={i} d={`M40,40 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`} fill={color} />
          })}
          <circle cx={40} cy={40} r={5} fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth={1} />
        </svg>
      </div>
    )
  }

  const bg = variant === 'classic' ? '#1a1a2e' : variant === 'neon' ? '#0a0a0f' : '#f8fafc'
  const colors = variant === 'classic'
    ? ['#991b1b', '#1e1e1e', '#166534', '#a16207']
    : variant === 'neon'
    ? ['#06b6d4', '#d946ef', '#84cc16', '#f97316']
    : ['#7c3aed', '#9f67ff', '#c4a5ff', '#e0d0ff']

  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: bg }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        {colors.map((color, i) => {
          const angle = (360 / colors.length) * i - 90
          const endAngle = angle + 360 / colors.length
          const r = 35
          const x1 = 40 + r * Math.cos(angle * Math.PI / 180)
          const y1 = 40 + r * Math.sin(angle * Math.PI / 180)
          const x2 = 40 + r * Math.cos(endAngle * Math.PI / 180)
          const y2 = 40 + r * Math.sin(endAngle * Math.PI / 180)
          return <path key={i} d={`M40,40 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`} fill={color} />
        })}
        <circle cx={40} cy={40} r={5} fill={variant === 'modern' ? '#7c3aed' : '#fff'} />
      </svg>
    </div>
  )
}

function GenericThumb({ label, variant }: { label: string; variant: TemplateStyle }) {
  if (variant === 'luxe') {
    return (
      <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center bg-gradient-hero text-card-foreground">
        <span className="text-2xl">{label}</span>
      </div>
    )
  }
  const bg = variant === 'classic' ? '#1a1a2e' : variant === 'neon' ? '#0a0a0f' : '#f8fafc'
  const text = variant === 'modern' ? 'text-gray-800' : 'text-white'
  return (
    <div className={`w-full aspect-[4/3] rounded-md flex items-center justify-center ${text}`} style={{ background: bg }}>
      <span className="text-2xl">{label}</span>
    </div>
  )
}

function StoryThumb({ label }: { label: string }): React.JSX.Element {
  // Story thumbnails are themed *and* vertical — hint at the 9:16 frame
  // so operators understand the shape before picking.
  return (
    <div
      className="w-full aspect-[4/3] rounded-md flex items-center justify-center bg-gradient-hero"
    >
      <div
        className="flex flex-col items-center justify-center rounded-sm bg-card/60 text-card-foreground"
        style={{ width: 32, height: 52 }}
      >
        <span className="text-lg leading-none">{label}</span>
      </div>
    </div>
  )
}

interface TemplatePickerProps {
  widgetType: string
}

export function TemplatePicker({ widgetType }: TemplatePickerProps) {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as Record<string, unknown> }))
  const currentTemplate = (props.template as TemplateStyle) || 'classic'
  const templates = TEMPLATE_FAMILIES[widgetType]

  if (!templates) return null

  return (
    <div className="space-y-2 p-3 border-b border-gray-700">
      <label className="block text-xs font-medium text-gray-300">Template</label>
      <div className="grid grid-cols-3 gap-2">
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setProp((p: Record<string, unknown>) => { p.template = tmpl.id })}
            className={`rounded-lg border-2 overflow-hidden transition-all ${
              currentTemplate === tmpl.id
                ? 'border-blue-500 ring-2 ring-blue-500/30'
                : 'border-gray-600 hover:border-gray-400'
            }`}
          >
            {tmpl.preview}
            <div className="px-2 py-1.5 bg-gray-800">
              <p className="text-[10px] font-medium text-gray-200 truncate">{tmpl.name}</p>
              {currentTemplate === tmpl.id && (
                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
