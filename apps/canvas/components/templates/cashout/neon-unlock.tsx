'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { CashoutTemplateProps } from '../shared-types'

function cooldownText(endsAt?: string) {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return null
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function NeonUnlock({
  conditions, allConditionsMet, rewardLabel, claimsUsed, maxClaims,
  cooldownEndsAt, onClaim,
  accentColor = '#06b6d4', textColor = '#e0f2fe', bgColor = '#0a0a0a',
}: CashoutTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'neon')
  const reduced = useReducedMotion()
  const cd = cooldownText(cooldownEndsAt)
  const canClaim = allConditionsMet && claimsUsed < maxClaims && !cd

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-2xl" style={{ background: bg, color: text }}>
      <style>{`
        @keyframes nu-pulse{0%,100%{box-shadow:0 0 8px ${accent}60}50%{box-shadow:0 0 24px ${accent}}}
        @keyframes nu-glitch{0%,100%{transform:translate(0)}25%{transform:translate(-2px,1px)}75%{transform:translate(2px,-1px)}}
        @keyframes nu-flicker{0%,100%{opacity:1}10%{opacity:.3}20%{opacity:1}30%{opacity:.5}}
        @media(prefers-reduced-motion:reduce){.nu-anim{animation:none!important}}
      `}</style>

      {/* Lock screen */}
      <div className="relative rounded-xl overflow-hidden border"
        style={{ borderColor: `${accent}40`, minHeight: 140, background: '#111' }}>

        {/* Reward (revealed when unlocked) */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0"
          animate={{ opacity: allConditionsMet ? 1 : 0.15 }}
          transition={{ duration: reduced ? 0 : 0.5 }}
        >
          <span className="text-3xl">💎</span>
          <span className="text-sm font-bold" style={{ color: accent }}>{rewardLabel}</span>
        </motion.div>

        {/* Lock overlay */}
        <motion.div
          className="nu-anim relative z-10 flex flex-col items-center justify-center gap-3 p-6"
          style={{
            background: allConditionsMet ? 'transparent' : `${bg}e6`,
            animation: allConditionsMet && !reduced ? 'nu-glitch 0.3s ease-out' : undefined,
          }}
          animate={{ opacity: allConditionsMet ? 0 : 1 }}
          transition={{ duration: reduced ? 0 : 0.4, delay: allConditionsMet ? 0.3 : 0 }}
        >
          {/* Progress rings */}
          <div className="flex gap-3">
            {conditions.map((c, i) => {
              const pct = c.targetValue > 0
                ? Math.min(1, c.currentValue / c.targetValue) : (c.met ? 1 : 0)
              const r = 18
              const circ = 2 * Math.PI * r
              const offset = circ * (1 - pct)
              return (
                <div key={i} className="relative" style={{ width: 44, height: 44 }}>
                  <svg width={44} height={44} viewBox="0 0 44 44">
                    <circle cx={22} cy={22} r={r} fill="none" stroke={`${accent}20`} strokeWidth={3} />
                    <motion.circle
                      cx={22} cy={22} r={r} fill="none"
                      stroke={c.met ? '#22c55e' : accent}
                      strokeWidth={3} strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: 'center',
                        filter: `drop-shadow(0 0 4px ${c.met ? '#22c55e' : accent})` }}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: reduced ? 0 : 0.8 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
                    {Math.round(pct * 100)}
                  </span>
                </div>
              )
            })}
          </div>
          <span className="text-[10px] uppercase tracking-widest opacity-40">Locked</span>
        </motion.div>
      </div>

      {/* Conditions */}
      <div className="mt-3 space-y-1">
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              background: c.met ? '#22c55e' : accent,
              boxShadow: `0 0 6px ${c.met ? '#22c55e' : accent}`,
            }} />
            <span className="flex-1 truncate" style={{ opacity: c.met ? 1 : 0.5 }}>{c.label}</span>
            <span className="tabular-nums opacity-40">{c.currentValue}/{c.targetValue}</span>
          </div>
        ))}
      </div>

      {/* Claim button */}
      <motion.button
        onClick={canClaim ? onClaim : undefined}
        disabled={!canClaim}
        className="nu-anim mt-4 w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
        style={{
          background: canClaim ? 'transparent' : `${accent}10`,
          border: `1px solid ${canClaim ? accent : `${accent}30`}`,
          color: canClaim ? accent : `${accent}50`,
          cursor: canClaim ? 'pointer' : 'not-allowed',
          animation: canClaim && !reduced ? `nu-pulse 1.5s ease-in-out infinite` : undefined,
        }}
        whileHover={canClaim && !reduced ? { scale: 1.02 } : {}}
        whileTap={canClaim ? { scale: 0.97 } : {}}
      >
        <Zap size={14} />
        {cd ? `Cooldown ${cd}` : canClaim ? 'Unlock Reward' : 'Locked'}
      </motion.button>

      <div className="mt-2 text-center text-[10px] opacity-30 tabular-nums">
        {claimsUsed} / {maxClaims} claims
      </div>
    </div>
  )
}
