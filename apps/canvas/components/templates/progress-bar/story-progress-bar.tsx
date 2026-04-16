'use client'

/**
 * Story-mode progress bar — 9:16 vertical. Big hero number centred,
 * vertical liquid-fill column on the left edge, CTA anchored bottom.
 */

import { motion } from 'framer-motion'
import type { ProgressBarTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'

export function StoryProgressBar({
  currentValue,
  targetValue,
  progressPercentage,
  completed,
  claimed,
  rewardLabel,
  onClaim,
}: ProgressBarTemplateProps): React.JSX.Element {
  const pct = Math.min(100, progressPercentage)

  return (
    <div
      className="relative mx-auto flex w-full max-w-sm overflow-hidden rounded-[var(--radius)] bg-gradient-hero text-card-foreground shadow-glow"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* Vertical fill column on the left */}
      <div className="relative w-3 bg-card/40">
        <motion.div
          className={`absolute inset-x-0 bottom-0 ${completed ? 'bg-gradient-win' : 'bg-accent'}`}
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-6 py-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Challenge
        </div>
        <h2 className="mt-1 text-xl font-bold">{rewardLabel}</h2>

        <div className="mt-auto text-center">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Progress
          </div>
          <div className="text-6xl font-black tracking-tight">
            <CountUp value={Math.round(pct)} />
            <span className="text-2xl">%</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            <CountUp value={currentValue} /> / <CountUp value={targetValue} />
          </div>
        </div>

        <div className="mt-6">
          {completed ? (
            <motion.button
              onClick={onClaim}
              disabled={claimed}
              whileTap={{ scale: 0.97 }}
              className="min-h-[56px] w-full rounded-full bg-gradient-win font-bold uppercase tracking-wider shadow-win disabled:opacity-50"
            >
              {claimed ? 'Claimed ✓' : 'Claim Reward'}
            </motion.button>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              Keep going to unlock your reward
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
