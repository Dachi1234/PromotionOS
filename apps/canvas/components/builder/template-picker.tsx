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

/**
 * After the "serious only" cull the wheel is the only widget with multiple
 * template families. Other widgets render a single inline serious default
 * and don't mount the TemplatePicker — so the map only needs WHEEL.
 */
const TEMPLATE_FAMILIES: Record<string, TemplateOption[]> = {
  WHEEL: [
    { id: 'stadium',    name: 'Stadium',     description: 'Navy + emerald multi-ring, gold rim.',     preview: <StadiumThumb /> },
    { id: 'jackpot',    name: 'Jackpot',     description: 'Vegas slot-floor gold & crimson.',         preview: <JackpotThumb /> },
    { id: 'casino_vip', name: 'Casino VIP',  description: 'Emerald baize + polished brass, VIP hub.', preview: <CasinoVIPThumb /> },
    { id: 'concentric', name: 'Wheel-in-Wheel', description: 'Two authorable rings — prizes + multipliers.', preview: <ConcentricThumb /> },
    { id: 'image',      name: 'Image',       description: 'Your PNG as the wheel face.',              preview: <ImageThumb /> },
  ],
}

/** Stadium thumbnail — mini mock of the concentric navy/green/gold wheel. */
function StadiumThumb() {
  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: '#0F2447' }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        <circle cx={40} cy={40} r={36} fill="none" stroke="#C9A24B" strokeWidth={3} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2
          const b = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2
          const r = 32
          return (
            <path
              key={i}
              d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
              fill={i % 2 ? '#103A2A' : '#081734'}
              stroke="#C9A24B"
              strokeWidth={0.4}
            />
          )
        })}
        <circle cx={40} cy={40} r={18} fill="#0F2447" stroke="#C9A24B" strokeWidth={0.8} />
        <circle cx={40} cy={40} r={8} fill="#1DB954" stroke="#C9A24B" strokeWidth={1} />
      </svg>
    </div>
  )
}

function JackpotThumb() {
  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: '#0E0B10' }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        <circle cx={40} cy={40} r={36} fill="none" stroke="#C9A24B" strokeWidth={3} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2
          const b = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
          const r = 32
          return (
            <path
              key={i}
              d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
              fill={i % 2 ? '#7C1D1D' : '#0E0B10'}
              stroke="#C9A24B"
              strokeWidth={0.4}
            />
          )
        })}
        <circle cx={40} cy={40} r={10} fill="#C9A24B" />
      </svg>
    </div>
  )
}

function CasinoVIPThumb() {
  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: '#063720' }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        <circle cx={40} cy={40} r={36} fill="none" stroke="#D4AF37" strokeWidth={3} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2
          const b = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
          const r = 32
          return (
            <path
              key={i}
              d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
              fill={i % 2 ? '#0A5334' : '#0B0E0B'}
              stroke="#D4AF37"
              strokeWidth={0.4}
            />
          )
        })}
        <circle cx={40} cy={40} r={12} fill="#0B0E0B" stroke="#D4AF37" strokeWidth={1} />
        <text x={40} y={43} fontSize={8} fontWeight={900} fill="#D4AF37" textAnchor="middle">VIP</text>
      </svg>
    </div>
  )
}

function ConcentricThumb() {
  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: '#0F2447' }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        <circle cx={40} cy={40} r={36} fill="none" stroke="#C9A24B" strokeWidth={3} />
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2
          const b = ((i + 1) / 10) * Math.PI * 2 - Math.PI / 2
          const r = 32
          return (
            <path key={i}
              d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
              fill={i % 2 ? '#103A2A' : '#1E6B4A'} stroke="#C9A24B" strokeWidth={0.4}
            />
          )
        })}
        <circle cx={40} cy={40} r={22} fill="#081734" stroke="#C9A24B" strokeWidth={0.8} />
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          const b = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2
          const r = 20
          return (
            <path key={`i${i}`}
              d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
              fill={i % 2 ? '#0F2447' : '#1E6B4A'} stroke="#C9A24B" strokeWidth={0.3}
            />
          )
        })}
        <circle cx={40} cy={40} r={7} fill="#1DB954" stroke="#C9A24B" strokeWidth={0.8} />
      </svg>
    </div>
  )
}

function ImageThumb() {
  return (
    <div className="w-full aspect-[4/3] rounded-md flex items-center justify-center" style={{ background: '#1a1a2e' }}>
      <svg viewBox="0 0 80 80" className="w-14 h-14">
        <defs>
          <radialGradient id="imgthumb-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1E6B4A" />
            <stop offset="100%" stopColor="#0A2A1A" />
          </radialGradient>
        </defs>
        <circle cx={40} cy={40} r={34} fill="url(#imgthumb-bg)" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 2" />
        <rect x={26} y={30} width={28} height={20} rx={2} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
        <circle cx={33} cy={37} r={2.5} fill="#9ca3af" />
        <path d="M28 48 L36 40 L44 46 L52 38 L52 48 Z" fill="#9ca3af" opacity={0.6} />
      </svg>
    </div>
  )
}

interface TemplatePickerProps {
  widgetType: string
}

export function TemplatePicker({ widgetType }: TemplatePickerProps) {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as Record<string, unknown> }))
  const currentTemplate = (props.template as TemplateStyle) || 'stadium'
  const templates = TEMPLATE_FAMILIES[widgetType]

  if (!templates) return null

  return (
    <div className="space-y-2 p-3 border-b border-gray-700">
      <label className="block text-xs font-medium text-gray-300">Template</label>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setProp((p: Record<string, unknown>) => { p.template = tmpl.id })}
            className={`relative rounded-lg border-2 overflow-hidden transition-all ${
              currentTemplate === tmpl.id
                ? 'border-blue-500 ring-2 ring-blue-500/30'
                : 'border-gray-600 hover:border-gray-400'
            }`}
          >
            {tmpl.preview}
            <div className="px-2 py-1.5 bg-gray-800">
              <p className="text-[10px] font-medium text-gray-200 truncate">{tmpl.name}</p>
            </div>
            {currentTemplate === tmpl.id && (
              <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
