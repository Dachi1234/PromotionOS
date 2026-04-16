'use client'

/**
 * LuxeCashout — token-driven claim card.
 *
 * Visual metaphor: a "ticket" with the reward label large, a conditions
 * checklist, and a gated claim button. On `allConditionsMet` the ticket
 * flips to the win gradient with `shadow-win`.
 */

import { motion } from 'framer-motion'
import type { CashoutTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'

export function LuxeCashout({
  conditions,
  allConditionsMet,
  rewardLabel,
  claimsUsed,
  maxClaims,
  cooldownEndsAt,
  onClaim,
}: CashoutTemplateProps): React.JSX.Element {
  const claimsLeft = Math.max(0, maxClaims - claimsUsed)
  const exhausted = claimsLeft === 0
  const canClaim = allConditionsMet && !exhausted && !cooldownEndsAt

  return (
    <div
      className={
        canClaim
          ? 'rounded-[var(--radius)] border border-border shadow-win bg-gradient-win text-card-foreground p-4 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-md mx-auto'
          : 'rounded-[var(--radius)] border border-border shadow-card bg-card text-card-foreground p-4 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-md mx-auto'
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Reward
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5">{rewardLabel}</h3>
        </div>
        <div
          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
            exhausted ? 'bg-muted text-muted-foreground' : 'bg-accent/20 text-accent'
          }`}
        >
          <CountUp value={claimsLeft} /> left
        </div>
      </div>

      {/* Conditions checklist */}
      {conditions.length > 0 && (
        <ul className="space-y-2">
          {conditions.map((c, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  c.met
                    ? 'bg-success text-white shadow-glow'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {c.met ? '✓' : '○'}
              </div>
              <div className="flex-1">
                <div className="font-medium">{c.label}</div>
                {!c.met && c.targetValue > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    <CountUp value={c.currentValue} /> / {c.targetValue}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Cooldown strip */}
      {cooldownEndsAt && (
        <div className="rounded-md bg-warning/20 text-warning-foreground px-3 py-2 text-xs font-medium">
          Next claim available at{' '}
          {new Date(cooldownEndsAt).toLocaleString()}
        </div>
      )}

      {/* CTA */}
      <motion.button
        onClick={onClaim}
        disabled={!canClaim}
        whileHover={canClaim ? { scale: 1.02 } : undefined}
        whileTap={canClaim ? { scale: 0.98 } : undefined}
        className="w-full min-h-[44px] rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition"
      >
        {exhausted ? 'All Claimed' : canClaim ? 'Claim Now' : 'Not Eligible Yet'}
      </motion.button>
    </div>
  )
}
