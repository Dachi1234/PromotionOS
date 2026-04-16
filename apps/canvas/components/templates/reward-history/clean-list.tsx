'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Gift, Coins, Star, Zap, Check } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { RewardHistoryTemplateProps } from '../shared-types'

type Status = 'pending' | 'fulfilled' | 'expired' | 'claimable'
const TABS: { label: string; value: Status | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Claimable', value: 'claimable' },
  { label: 'Pending', value: 'pending' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Expired', value: 'expired' },
]

const TYPE_ICONS: Record<string, typeof Gift> = {
  cash: Coins, bonus: Gift, spins: Star, multiplier: Zap,
}

const STATUS_COLORS: Record<Status, string> = {
  claimable: '#22c55e', pending: '#eab308', fulfilled: '#6366f1', expired: '#6b7280',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CleanList({
  rewards, onClaim,
  accentColor = '#6366f1', textColor = '#1f2937', bgColor = '#ffffff',
}: RewardHistoryTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'modern')
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const filtered = filter === 'all' ? rewards : rewards.filter(r => r.status === filter)

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl p-4" style={{ background: bg, color: text }}>
      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: filter === t.value ? accent : `${accent}10`,
              color: filter === t.value ? '#fff' : text,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm opacity-40">No rewards</div>
        )}
        {filtered.map((r) => {
          const Icon = TYPE_ICONS[r.type] ?? Gift
          const sc = STATUS_COLORS[r.status]
          return (
            <motion.div
              key={r.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
              style={{ background: `${text}04` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${sc}15` }}>
                <Icon size={18} style={{ color: sc }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{r.label}</div>
                <div className="text-[11px] opacity-50 tabular-nums">{formatDate(r.date)}</div>
              </div>
              {r.status === 'claimable' ? (
                <motion.button onClick={() => onClaim(r.id)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold shrink-0"
                  style={{ background: '#22c55e', color: '#fff' }}
                  whileHover={reduced ? {} : { scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}>
                  Claim
                </motion.button>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0"
                  style={{ background: `${sc}15`, color: sc }}>
                  {r.status === 'fulfilled' && <Check size={10} className="inline mr-0.5 -mt-px" />}
                  {r.status}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
