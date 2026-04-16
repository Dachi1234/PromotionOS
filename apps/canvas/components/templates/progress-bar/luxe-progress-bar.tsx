'use client'

/**
 * LuxeProgressBar — token-driven progress meter.
 *
 * Two stacked layers:
 *   - The track (`bg-[hsl(var(--progress-track))]`) is a muted slab.
 *   - The fill (`bg-[hsl(var(--progress-fill))]`) is the active color — the
 *     `casino-lux` theme sets this to gold, `playful` to hot pink, `esports`
 *     to cyan. So the same component looks dramatically different per theme.
 *
 * On completion the whole card flips into the win gradient with `shadow-win`
 * and animates the claim CTA. The numeric readout uses <CountUp> so pushes
 * from SSE animate instead of snap.
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { ProgressBarTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'

export function LuxeProgressBar({
  currentValue,
  targetValue,
  progressPercentage,
  completed,
  claimed,
  rewardLabel,
  onClaim,
}: ProgressBarTemplateProps): React.JSX.Element {
  const reduced = useReducedMotion()
  const pct = Math.max(0, Math.min(100, progressPercentage))

  return (
    <div
      className={
        completed && !claimed
          ? 'rounded-[var(--radius)] border border-border shadow-win bg-gradient-win text-card-foreground p-4 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-md mx-auto'
          : 'rounded-[var(--radius)] border border-border shadow-card bg-card text-card-foreground p-4 sm:p-6 space-y-3 sm:space-y-4 w-full max-w-md mx-auto'
      }
    >
      {/* Headline */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {claimed ? 'Complete' : completed ? 'Ready to claim' : 'In progress'}
          </div>
          <div className="text-lg font-bold mt-0.5">{rewardLabel}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tabular-nums leading-none">
            <CountUp value={currentValue} />
          </div>
          <div className="text-xs text-muted-foreground">of {targetValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Track + fill */}
      <div className="relative h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(var(--progress-track))' }}>
        <motion.div
          initial={reduced ? { width: `${pct}%` } : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: completed
              ? 'var(--gradient-win)'
              : 'hsl(var(--progress-fill))',
            boxShadow: completed ? 'var(--shadow-win)' : 'var(--shadow-glow)',
          }}
        />
        {/* Percentage ticker — shows only when fill is long enough to read */}
        {pct > 12 && (
          <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-card-foreground mix-blend-difference">
            {Math.round(pct)}%
          </div>
        )}
      </div>

      {/* CTA */}
      {completed && !claimed && (
        <motion.button
          onClick={onClaim}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="w-full min-h-[44px] rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all"
        >
          Claim Reward
        </motion.button>
      )}
      {claimed && (
        <div className="text-center text-sm font-medium text-success">
          ✓ Claimed
        </div>
      )}
    </div>
  )
}
