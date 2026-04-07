'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Coins, Star, Zap, Gift, X } from 'lucide-react'
import type { RewardHistoryTemplateProps } from '../shared-types'

const TYPE_CONFIG: Record<string, { icon: typeof Gift; color: string }> = {
  cash:       { icon: Coins, color: '#eab308' },
  spins:      { icon: Star,  color: '#3b82f6' },
  multiplier: { icon: Zap,   color: '#22c55e' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NeonCollection({
  rewards, onClaim,
  accentColor = '#06b6d4', textColor = '#e0f2fe', bgColor = '#0a0a0a',
}: RewardHistoryTemplateProps) {
  const reduced = useReducedMotion()
  const [detail, setDetail] = useState<string | null>(null)
  const detailReward = rewards.find(r => r.id === detail)

  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-2xl relative" style={{ background: bgColor, color: textColor }}>
      <style>{`
        @keyframes nc-blink{0%,100%{opacity:.4}50%{opacity:1}}
        @media(prefers-reduced-motion:reduce){.nc-anim{animation:none!important}}
      `}</style>

      <div className="grid grid-cols-4 gap-2">
        {rewards.map((r) => {
          const cfg = TYPE_CONFIG[r.type] ?? { icon: Gift, color: accentColor }
          const Icon = cfg.icon
          const isPending = r.status === 'pending'
          const isExpired = r.status === 'expired'
          const isFulfilled = r.status === 'fulfilled'

          return (
            <motion.button
              key={r.id}
              onClick={() => setDetail(r.id)}
              className="nc-anim aspect-square rounded-xl flex flex-col items-center justify-center gap-1 relative"
              style={{
                background: isExpired ? '#111' : '#111',
                border: `1px solid ${isExpired ? '#333' : cfg.color}40`,
                boxShadow: isExpired ? 'none' : `0 0 8px ${cfg.color}20, inset 0 0 8px ${cfg.color}10`,
                animation: isPending && !reduced ? 'nc-blink 2.5s ease-in-out infinite' : undefined,
                opacity: isExpired ? 0.3 : 1,
              }}
              whileHover={reduced ? {} : { scale: 1.05, boxShadow: `0 0 16px ${cfg.color}40` }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon size={20} style={{
                color: isFulfilled || isPending ? cfg.color : '#555',
                filter: isExpired ? 'none' : `drop-shadow(0 0 4px ${cfg.color})`,
              }} />
              <span className="text-[8px] font-medium truncate w-full text-center px-1 opacity-60">
                {r.label}
              </span>
              {r.status === 'claimable' && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Detail popover */}
      <AnimatePresence>
        {detailReward && (
          <motion.div
            key="overlay"
            className="absolute inset-0 z-20 flex items-end rounded-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} />
            <motion.div
              className="relative w-full p-4 rounded-t-2xl space-y-2"
              style={{ background: '#151515', borderTop: `1px solid ${accentColor}30` }}
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
            >
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 opacity-40 hover:opacity-100">
                <X size={16} />
              </button>
              <div className="text-sm font-bold">{detailReward.label}</div>
              <div className="flex justify-between text-xs opacity-50">
                <span>Amount: {detailReward.amount}</span>
                <span>{formatDate(detailReward.date)}</span>
              </div>
              <div className="text-xs capitalize" style={{
                color: detailReward.status === 'claimable' ? '#22c55e'
                  : detailReward.status === 'expired' ? '#6b7280' : accentColor,
              }}>
                {detailReward.status}
              </div>
              {detailReward.status === 'claimable' && (
                <motion.button
                  onClick={() => { onClaim(detailReward.id); setDetail(null) }}
                  className="w-full py-2 rounded-lg text-xs font-bold"
                  style={{ border: `1px solid #22c55e`, color: '#22c55e' }}
                  whileHover={reduced ? {} : { boxShadow: '0 0 12px #22c55e40' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Claim Now
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
