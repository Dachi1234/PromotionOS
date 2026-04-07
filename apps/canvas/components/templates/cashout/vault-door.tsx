'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Lock, Unlock } from 'lucide-react'
import type { CashoutTemplateProps } from '../shared-types'

function cooldownText(endsAt?: string) {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return null
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VaultDoor({
  conditions, allConditionsMet, rewardLabel, claimsUsed, maxClaims,
  cooldownEndsAt, onClaim,
  accentColor = '#d4a017', textColor = '#fef3c7', bgColor = '#1c1917',
}: CashoutTemplateProps) {
  const reduced = useReducedMotion()
  const cd = cooldownText(cooldownEndsAt)
  const canClaim = allConditionsMet && claimsUsed < maxClaims && !cd

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-2xl" style={{ background: bgColor, color: textColor }}>
      <style>{`
        @keyframes vd-shimmer{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes vd-glow{0%,100%{box-shadow:0 0 12px #d4a01740}50%{box-shadow:0 0 28px #d4a01780}}
        @media(prefers-reduced-motion:reduce){.vd-anim{animation:none!important}}
      `}</style>

      {/* Vault frame */}
      <div className="relative mx-auto rounded-xl overflow-hidden border-2"
        style={{ width: 220, height: 200, borderColor: accentColor, background: '#292524' }}>

        {/* Reward behind door */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <span className="text-3xl">🏆</span>
          <span className="text-sm font-bold text-center px-4" style={{ color: accentColor }}>
            {rewardLabel}
          </span>
        </div>

        {/* Vault door */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
          style={{
            background: `linear-gradient(135deg, #78716c, #44403c, #57534e)`,
            transformOrigin: 'left center',
            borderRight: `3px solid ${accentColor}`,
          }}
          animate={allConditionsMet ? { rotateY: -95, opacity: 0.3 } : { rotateY: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.8, ease: 'easeInOut' }}
        >
          {/* Combination dials */}
          <div className="flex gap-2">
            {conditions.map((c, i) => {
              const pct = c.targetValue > 0
                ? Math.min(1, c.currentValue / c.targetValue) : (c.met ? 1 : 0)
              const deg = pct * 360
              return (
                <div key={i} className="relative w-10 h-10 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: c.met ? '#22c55e' : '#78716c', background: '#1c1917' }}>
                  <motion.div
                    className="absolute inset-1 rounded-full"
                    style={{
                      background: `conic-gradient(${c.met ? '#22c55e' : accentColor} ${deg}deg, transparent 0deg)`,
                      opacity: 0.4,
                    }}
                    animate={{ rotate: c.met ? 360 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.6 }}
                  />
                  <span className="relative text-[9px] font-bold tabular-nums" style={{ color: textColor }}>
                    {Math.round(pct * 100)}
                  </span>
                </div>
              )
            })}
          </div>

          {allConditionsMet
            ? <Unlock size={20} style={{ color: '#22c55e' }} />
            : <Lock size={20} style={{ color: '#78716c' }} />}
        </motion.div>
      </div>

      {/* Conditions list */}
      <div className="mt-4 space-y-1.5">
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span style={{ color: c.met ? '#22c55e' : '#78716c' }}>{c.met ? '✓' : '○'}</span>
            <span className="flex-1 truncate" style={{ opacity: c.met ? 1 : 0.6 }}>{c.label}</span>
            <span className="tabular-nums opacity-50">{c.currentValue}/{c.targetValue}</span>
          </div>
        ))}
      </div>

      {/* Claim button (vault handle) */}
      <motion.button
        onClick={canClaim ? onClaim : undefined}
        disabled={!canClaim}
        className="vd-anim mt-4 w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: canClaim
            ? `linear-gradient(135deg, ${accentColor}, #b8860b)` : '#44403c',
          color: canClaim ? '#1c1917' : '#78716c',
          cursor: canClaim ? 'pointer' : 'not-allowed',
          animation: canClaim && !reduced ? 'vd-glow 2s ease-in-out infinite' : undefined,
        }}
        whileHover={canClaim && !reduced ? { scale: 1.02 } : {}}
        whileTap={canClaim ? { scale: 0.97 } : {}}
      >
        <Unlock size={14} />
        {cd ? `Cooldown ${cd}` : canClaim ? 'Open Vault' : 'Locked'}
      </motion.button>

      {/* Claims counter */}
      <div className="mt-2 text-center text-[10px] opacity-40 tabular-nums">
        {claimsUsed} / {maxClaims} claims used
      </div>
    </div>
  )
}
