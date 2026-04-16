'use client'

/**
 * LuxeRewardHistory — token-driven reward collection.
 *
 * Grid of reward tiles, each with status-colored accent strip. Claimable
 * rewards pulse with a subtle glow. Every chrome element (card, badges,
 * separators) reads from theme tokens so all 4 themes get a distinct look
 * for free.
 */

import { motion } from 'framer-motion'
import type { RewardHistoryTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'

const STATUS_STYLES: Record<
  RewardHistoryTemplateProps['rewards'][number]['status'],
  { ring: string; pill: string; label: string }
> = {
  fulfilled: { ring: 'border-success/40', pill: 'bg-success/15 text-success', label: 'Fulfilled' },
  pending: { ring: 'border-warning/40', pill: 'bg-warning/15 text-warning-foreground', label: 'Pending' },
  claimable: { ring: 'border-accent', pill: 'bg-accent text-accent-foreground', label: 'Claim!' },
  expired: { ring: 'border-border', pill: 'bg-muted text-muted-foreground', label: 'Expired' },
}

const TYPE_GLYPH: Record<string, string> = {
  VIRTUAL_COINS: '🪙',
  CASH: '💵',
  CASHBACK: '💸',
  FREE_SPINS: '🎡',
  FREE_BET: '🎫',
  EXTRA_SPIN: '🔄',
  ACCESS_UNLOCK: '🔑',
  BONUS: '🎁',
}

export function LuxeRewardHistory({
  rewards,
  onClaim,
}: RewardHistoryTemplateProps): React.JSX.Element {
  return (
    <div className="rounded-[var(--radius)] bg-card text-card-foreground border border-border shadow-card p-4 sm:p-6 w-full max-w-md mx-auto">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-bold">Your Rewards</h3>
        <span className="text-xs text-muted-foreground">
          <CountUp value={rewards.length} /> total
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {rewards.map((r, i) => {
          const style = STATUS_STYLES[r.status]
          const glyph = TYPE_GLYPH[r.type] ?? '🎁'
          const isClaimable = r.status === 'claimable'
          const isExpired = r.status === 'expired'

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`relative rounded-[calc(var(--radius)-4px)] border-2 ${style.ring} bg-muted/40 p-3 min-h-[44px] flex items-center gap-3 ${
                isClaimable ? 'shadow-glow' : ''
              } ${isExpired ? 'opacity-60' : ''}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-background shrink-0">
                {glyph}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{r.label}</div>
                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                  <CountUp value={r.amount} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.date}</div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${style.pill}`}>
                  {style.label}
                </span>
                {isClaimable && (
                  <button
                    onClick={() => onClaim(r.id)}
                    className="text-xs font-bold text-primary hover:underline min-h-[44px] min-w-[44px] px-2 flex items-center justify-end"
                  >
                    Claim →
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
