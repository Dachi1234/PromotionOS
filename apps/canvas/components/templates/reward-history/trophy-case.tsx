'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Trophy, Gift, Star, Coins } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { RewardHistoryTemplateProps } from '../shared-types'

const TYPE_ICONS: Record<string, typeof Trophy> = {
  cash: Coins, bonus: Gift, spins: Star,
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TrophyCase({
  rewards, onClaim,
  accentColor = '#d4a017', textColor = '#fef3c7', bgColor = '#1c1917',
}: RewardHistoryTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'classic')
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-2xl" style={{ background: bg, color: text }}>
      <style>{`
        @keyframes tc-glow{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes tc-shine{0%{background-position:200%}100%{background-position:-200%}}
        @media(prefers-reduced-motion:reduce){.tc-anim{animation:none!important}}
        .tc-shelf{scrollbar-width:thin;scrollbar-color:${accent}30 transparent}
      `}</style>

      <div className="text-sm font-bold mb-3 flex items-center gap-2">
        <Trophy size={16} style={{ color: accent }} />
        <span>Trophy Case</span>
        <span className="ml-auto text-[10px] opacity-40 tabular-nums">{rewards.length} items</span>
      </div>

      {/* Horizontal scroll shelf */}
      <div className="tc-shelf flex gap-3 overflow-x-auto pb-3 px-1 snap-x snap-mandatory">
        {rewards.map((r) => {
          const Icon = TYPE_ICONS[r.type] ?? Gift
          const isPending = r.status === 'pending'
          const isExpired = r.status === 'expired'
          const isClaimable = r.status === 'claimable'

          return (
            <motion.button
              key={r.id}
              onClick={() => setSelected(selected === r.id ? null : r.id)}
              className="tc-anim snap-start shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl relative"
              style={{
                width: 100,
                background: '#292524',
                opacity: isExpired ? 0.35 : 1,
                borderBottom: `3px solid ${accent}40`,
                animation: isPending && !reduced ? 'tc-glow 2s ease-in-out infinite' : undefined,
              }}
              whileHover={reduced ? {} : { y: -3 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isPending ? `${accent}20` : isExpired ? '#44403c' : `${accent}30`,
                  boxShadow: isPending ? `0 0 12px ${accent}40` : 'none',
                }}>
                <Icon size={20} style={{ color: isExpired ? '#78716c' : accent }} />
              </div>
              <span className="text-[10px] font-semibold text-center truncate w-full">{r.label}</span>
              <span className="text-[9px] opacity-40">{formatDate(r.date)}</span>

              {/* Status badge */}
              {isClaimable && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
                  style={{ boxShadow: '0 0 6px #22c55e' }} />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Detail popover */}
      <AnimatePresence>
        {selected && (() => {
          const r = rewards.find(rw => rw.id === selected)
          if (!r) return null
          return (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3 rounded-xl text-xs space-y-2" style={{ background: '#292524' }}>
                <div className="flex justify-between">
                  <span className="font-bold">{r.label}</span>
                  <span className="capitalize opacity-50">{r.status}</span>
                </div>
                <div className="flex justify-between opacity-60">
                  <span>Amount: {r.amount}</span>
                  <span>{formatDate(r.date)}</span>
                </div>
                {r.status === 'claimable' && (
                  <motion.button
                    onClick={() => onClaim(r.id)}
                    className="w-full py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: accent, color: bg }}
                    whileHover={reduced ? {} : { scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Claim
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
