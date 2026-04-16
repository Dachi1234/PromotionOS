'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { OptInTemplateProps } from '../shared-types'

function darken(hex: string, amount: number) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function ClassicCTA({
  optedIn, eligible, onOptIn, preLabel, postLabel,
  accentColor = '#6366f1', textColor = '#ffffff', bgColor = '#f8fafc',
}: OptInTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'classic')
  const reduced = useReducedMotion()
  const secondary = darken(accentColor, 40)

  if (optedIn) {
    return (
      <div className="w-full max-w-xs mx-auto" style={{ color: text }}>
        <motion.div
          className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm"
          style={{
            background: bg,
            border: `2px solid ${accent}`,
            color: accent,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, duration: reduced ? 0 : undefined }}
        >
          <Check size={18} strokeWidth={3} style={{ color: '#d4a017' }} />
          <span style={{ color: '#d4a017' }}>{postLabel}</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <style>{`
        @media(prefers-reduced-motion:reduce){.cta-anim{animation:none!important;transition:none!important}}
      `}</style>
      <motion.button
        onClick={eligible ? onOptIn : undefined}
        disabled={!eligible}
        className="cta-anim w-full py-3.5 px-6 rounded-xl text-sm font-extrabold uppercase tracking-wider"
        style={{
          background: eligible
            ? `linear-gradient(135deg, ${accent}, ${secondary})` : '#d1d5db',
          color: eligible ? text : '#9ca3af',
          cursor: eligible ? 'pointer' : 'not-allowed',
          boxShadow: eligible
            ? `0 4px 0 ${darken(secondary, 30)}, 0 6px 16px ${accent}30`
            : '0 2px 0 #b0b0b0',
          transform: 'translateY(0)',
        }}
        whileHover={eligible && !reduced ? {
          y: -2,
          boxShadow: `0 6px 0 ${darken(secondary, 30)}, 0 10px 24px ${accent}40`,
        } : {}}
        whileTap={eligible ? {
          y: 2,
          boxShadow: `0 1px 0 ${darken(secondary, 30)}, 0 2px 8px ${accent}20`,
        } : {}}
      >
        {preLabel}
      </motion.button>
    </div>
  )
}
