'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Gift, Check, X, Clock } from 'lucide-react'
import type { CashoutTemplateProps } from '../shared-types'

function cooldownText(endsAt?: string) {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return null
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CleanClaimCard({
  conditions, allConditionsMet, rewardLabel, claimsUsed, maxClaims,
  cooldownEndsAt, onClaim,
  accentColor = '#6366f1', textColor = '#1f2937', bgColor = '#ffffff',
}: CashoutTemplateProps) {
  const reduced = useReducedMotion()
  const cd = cooldownText(cooldownEndsAt)
  const canClaim = allConditionsMet && claimsUsed < maxClaims && !cd

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl p-5 shadow-lg"
      style={{ background: bgColor, color: textColor }}>
      <style>{`
        @keyframes cc-pop{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
        @media(prefers-reduced-motion:reduce){.cc-anim{animation:none!important}}
      `}</style>

      {/* Reward header */}
      <div className="flex items-center gap-3 mb-4 pb-3"
        style={{ borderBottom: `1px solid ${accentColor}15` }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${accentColor}12` }}>
          <Gift size={22} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold truncate">{rewardLabel}</div>
          <div className="text-[11px] opacity-50 tabular-nums">
            {claimsUsed} of {maxClaims} claims used
          </div>
        </div>
      </div>

      {/* Conditions checklist */}
      <div className="space-y-2 mb-4">
        {conditions.map((c, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-sm"
            style={{ background: c.met ? '#22c55e08' : `${textColor}05` }}
            initial={false}
            animate={{ opacity: 1 }}
          >
            <div className="cc-anim w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: c.met ? '#22c55e' : '#e5e7eb',
                animation: c.met && !reduced ? 'cc-pop 0.3s ease-out' : undefined,
              }}>
              {c.met
                ? <Check size={12} color="#fff" strokeWidth={3} />
                : <X size={10} color="#9ca3af" strokeWidth={3} />}
            </div>
            <span className="flex-1 truncate" style={{ opacity: c.met ? 1 : 0.6 }}>{c.label}</span>
            <span className="text-xs tabular-nums opacity-40 shrink-0">
              {c.currentValue}/{c.targetValue}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Cooldown timer */}
      {cd && (
        <div className="flex items-center justify-center gap-1.5 text-xs mb-3 opacity-50">
          <Clock size={12} />
          <span className="tabular-nums">Cooldown: {cd}</span>
        </div>
      )}

      {/* Claim button */}
      <motion.button
        onClick={canClaim ? onClaim : undefined}
        disabled={!canClaim}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all"
        style={{
          background: canClaim ? accentColor : '#e5e7eb',
          color: canClaim ? '#fff' : '#9ca3af',
          cursor: canClaim ? 'pointer' : 'not-allowed',
          boxShadow: canClaim ? `0 4px 14px ${accentColor}30` : 'none',
        }}
        whileHover={canClaim && !reduced ? { scale: 1.02, boxShadow: `0 6px 20px ${accentColor}40` } : {}}
        whileTap={canClaim ? { scale: 0.97 } : {}}
      >
        {cd ? 'On Cooldown' : canClaim ? 'Claim Reward' : 'Complete All Conditions'}
      </motion.button>
    </div>
  )
}
