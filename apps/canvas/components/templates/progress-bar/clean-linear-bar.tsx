'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ProgressBarTemplateProps } from '../shared-types'

function lighten(hex: string, amount: number) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function CleanLinearBar({
  currentValue, targetValue, progressPercentage, completed, claimed,
  rewardLabel, onClaim,
  accentColor = '#6366f1', textColor = '#374151', bgColor = '#ffffff',
}: ProgressBarTemplateProps) {
  const reduced = useReducedMotion()
  const pct = Math.min(100, Math.max(0, progressPercentage))
  const lightAccent = lighten(accentColor, 60)

  return (
    <div className="w-full max-w-md mx-auto p-5" style={{ color: textColor }}>
      <style>{`
        @keyframes clb-flash{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes clb-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){.clb-anim{animation:none!important}}
      `}</style>

      {/* Label */}
      {rewardLabel && (
        <div className="text-xs font-medium mb-2 opacity-70">{rewardLabel}</div>
      )}

      {/* Bar track */}
      <div className="relative w-full rounded-full overflow-hidden"
        style={{ height: 32, background: `${accentColor}12` }}>

        {/* Fill */}
        <motion.div
          className="clb-anim absolute inset-y-0 left-0 rounded-full flex items-center justify-end pr-2"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 4)}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            background: `linear-gradient(90deg, ${accentColor}, ${lightAccent})`,
            boxShadow: pct > 0 ? `0 2px 8px ${accentColor}30` : 'none',
            animation: completed && !claimed && !reduced ? 'clb-flash 1s ease-in-out 1' : undefined,
            minWidth: pct > 0 ? 36 : 0,
          }}
        >
          {/* Percentage label inside fill */}
          {pct >= 8 && (
            <span className="text-xs font-bold tabular-nums whitespace-nowrap"
              style={{ color: bgColor }}>
              {Math.round(pct)}%
            </span>
          )}
        </motion.div>

        {/* Percentage outside for small values */}
        {pct > 0 && pct < 8 && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums"
            style={{ color: accentColor }}>
            {Math.round(pct)}%
          </span>
        )}

        {/* Completed checkmark */}
        {completed && (
          <motion.div
            className="absolute right-2 top-1/2 -translate-y-1/2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: reduced ? 0 : 0.5 }}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: bgColor }}>
              <Check size={12} color="#22c55e" strokeWidth={3} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Values below */}
      <div className="flex justify-between mt-1.5">
        <span className="text-xs tabular-nums opacity-60">{currentValue.toLocaleString()}</span>
        <span className="text-xs tabular-nums opacity-60">{targetValue.toLocaleString()}</span>
      </div>

      {/* Claim button */}
      {completed && !claimed && (
        <motion.div
          className="clb-anim mt-3 flex justify-center"
          style={{ animation: !reduced ? 'clb-fade 0.4s ease-out 0.6s both' : undefined }}
        >
          <motion.button
            onClick={onClaim}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-shadow"
            style={{
              background: accentColor,
              color: bgColor,
              boxShadow: `0 2px 12px ${accentColor}30`,
            }}
            whileHover={reduced ? {} : { scale: 1.03, boxShadow: `0 4px 20px ${accentColor}40` }}
            whileTap={{ scale: 0.97 }}
          >
            Claim Reward
          </motion.button>
        </motion.div>
      )}

      {claimed && (
        <div className="mt-3 text-center text-xs font-medium" style={{ color: '#22c55e' }}>
          ✓ Reward claimed
        </div>
      )}
    </div>
  )
}
