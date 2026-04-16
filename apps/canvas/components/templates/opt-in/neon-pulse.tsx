'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { OptInTemplateProps } from '../shared-types'

export function NeonPulse({
  optedIn, eligible, onOptIn, preLabel, postLabel,
  accentColor = '#06b6d4', textColor = '#e0f2fe', bgColor = '#0a0a0a',
}: OptInTemplateProps) {
  const { accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'neon')
  const reduced = useReducedMotion()

  if (optedIn) {
    return (
      <div className="w-full max-w-xs mx-auto">
        <style>{`
          @keyframes np-flicker{0%,100%{opacity:1}5%{opacity:.2}10%{opacity:1}15%{opacity:.4}20%{opacity:1}}
          @media(prefers-reduced-motion:reduce){.np-anim{animation:none!important}}
        `}</style>
        <motion.div
          className="np-anim flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg text-sm font-bold"
          style={{
            border: `1px solid ${accent}`,
            color: accent,
            background: `${accent}08`,
            textShadow: `0 0 8px ${accent}`,
            boxShadow: `0 0 12px ${accent}30`,
            animation: !reduced ? 'np-flicker 2s ease-in-out 1' : undefined,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
        >
          <Check size={16} strokeWidth={3} />
          <span>{postLabel}</span>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <style>{`
        @keyframes np-glow{0%,100%{box-shadow:0 0 8px ${accent}50,inset 0 0 8px ${accent}10}50%{box-shadow:0 0 20px ${accent}80,inset 0 0 12px ${accent}20}}
        @media(prefers-reduced-motion:reduce){.np-anim{animation:none!important}}
      `}</style>
      <motion.button
        onClick={eligible ? onOptIn : undefined}
        disabled={!eligible}
        className="np-anim w-full py-2.5 px-6 rounded-lg text-sm font-bold"
        style={{
          background: 'transparent',
          border: `1px solid ${eligible ? accent : '#333'}`,
          color: eligible ? accent : '#555',
          cursor: eligible ? 'pointer' : 'not-allowed',
          textShadow: eligible ? `0 0 10px ${accent}` : 'none',
          animation: eligible && !reduced ? 'np-glow 2s ease-in-out infinite' : undefined,
        }}
        whileHover={eligible && !reduced ? { scale: 1.03 } : {}}
        whileTap={eligible ? { scale: 0.97 } : {}}
      >
        {preLabel}
      </motion.button>
    </div>
  )
}
