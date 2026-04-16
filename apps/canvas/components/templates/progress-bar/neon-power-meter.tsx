'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { ProgressBarTemplateProps } from '../shared-types'

const BAR_COUNT = 20

function barColor(index: number, total: number, _accent: string) {
  const ratio = index / total
  if (ratio < 0.5) return '#22c55e'
  if (ratio < 0.8) return '#eab308'
  return '#ef4444'
}

function sevenSeg(value: string, color: string) {
  return (
    <span style={{
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      fontWeight: 700, letterSpacing: 2,
      color, textShadow: `0 0 6px ${color}, 0 0 12px ${color}60`,
    }}>
      {value}
    </span>
  )
}

export function NeonPowerMeter({
  currentValue, targetValue, progressPercentage, completed, claimed,
  rewardLabel, onClaim,
  accentColor = '#00ff88', textColor = '#ffffff', bgColor = '#0a0a0f',
}: ProgressBarTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'neon')
  const reduced = useReducedMotion()
  const pct = Math.min(100, Math.max(0, progressPercentage))
  const litBars = Math.round((pct / 100) * BAR_COUNT)

  const flashSequence = useMemo(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => i * 0.06), [])

  return (
    <div className="w-full max-w-md mx-auto p-6" style={{ background: bg, color: text }}>
      <style>{`
        @keyframes npm-flash{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes npm-flicker{0%,18%,22%,36%,40%,100%{opacity:1}20%,38%{opacity:0.2}}
        @keyframes npm-glow{0%,100%{text-shadow:0 0 6px currentColor,0 0 12px currentColor}50%{text-shadow:0 0 12px currentColor,0 0 24px currentColor}}
        @media(prefers-reduced-motion:reduce){.npm-anim{animation:none!important}}
      `}</style>

      {/* Label */}
      <div className="text-[10px] uppercase tracking-[0.3em] text-center mb-4"
        style={{ color: `${accent}60` }}>
        {rewardLabel || 'POWER LEVEL'}
      </div>

      {/* Meter bars */}
      <div className="flex items-end justify-center gap-1 px-2" style={{ height: 80 }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const isLit = i < litBars
          const color = barColor(i, BAR_COUNT, accent)
          const height = 30 + (i / BAR_COUNT) * 50

          return (
            <motion.div
              key={i}
              className="npm-anim rounded-sm"
              style={{
                width: `${100 / BAR_COUNT - 1}%`,
                maxWidth: 16, minWidth: 6,
                background: isLit ? color : `${color}12`,
                border: `1px solid ${isLit ? color : `${color}20`}`,
                boxShadow: isLit ? `0 0 8px ${color}60, inset 0 0 4px ${color}40` : 'none',
                opacity: isLit ? 1 : 0.25,
                animation: completed && !claimed && isLit && !reduced
                  ? `npm-flash 0.4s ease-in-out ${flashSequence[i]}s 3`
                  : undefined,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{
                duration: reduced ? 0 : 0.4,
                delay: reduced ? 0 : i * 0.03,
                ease: 'easeOut',
              }}
            />
          )
        })}
      </div>

      {/* "MAXIMUM POWER" text */}
      <AnimatePresence>
        {completed && !claimed && (
          <motion.div
            className="npm-anim text-center mt-4 text-sm font-bold uppercase tracking-[0.4em]"
            style={{
              color: '#ef4444',
              animation: !reduced ? 'npm-flicker 2s step-end infinite' : undefined,
              textShadow: '0 0 8px #ef4444, 0 0 16px #ef444460',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.4 }}
          >
            MAXIMUM POWER
          </motion.div>
        )}
      </AnimatePresence>

      {/* LED readout */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider mb-0.5"
            style={{ color: `${accent}50` }}>Current</span>
          {sevenSeg(currentValue.toLocaleString(), accent)}
        </div>
        <span className="text-lg opacity-20" style={{ color: accent }}>/</span>
        <div className="flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider mb-0.5"
            style={{ color: `${accent}50` }}>Target</span>
          {sevenSeg(targetValue.toLocaleString(), `${accent}80`)}
        </div>
      </div>

      {/* Percentage */}
      <div className="npm-anim text-center mt-3 text-2xl font-bold tabular-nums"
        style={{
          color: accent,
          textShadow: `0 0 8px ${accent}, 0 0 16px ${accent}60`,
          animation: completed && !claimed && !reduced ? 'npm-glow 1.5s ease-in-out infinite' : undefined,
        }}>
        {Math.round(pct)}%
      </div>

      {/* Claim button */}
      {completed && !claimed && (
        <motion.div className="flex justify-center mt-4">
          <motion.button
            onClick={onClaim}
            className="px-5 py-2 rounded text-xs font-bold uppercase tracking-wider"
            style={{
              background: 'transparent',
              color: accent,
              border: `2px solid ${accent}`,
              boxShadow: `0 0 12px ${accent}30, inset 0 0 12px ${accent}10`,
            }}
            whileHover={reduced ? {} : {
              boxShadow: `0 0 20px ${accent}50, inset 0 0 20px ${accent}20`,
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
          >
            Claim Reward
          </motion.button>
        </motion.div>
      )}

      {claimed && (
        <div className="text-center mt-4 text-xs font-mono uppercase tracking-wider"
          style={{ color: '#22c55e', textShadow: '0 0 6px #22c55e60' }}>
          ▶ REWARD COLLECTED
        </div>
      )}
    </div>
  )
}
