'use client'

/**
 * Story-mode opt-in — 9:16 vertical full-bleed CTA card. Big headline,
 * decorative halo, single primary button anchored in the thumb zone.
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { OptInTemplateProps } from '../shared-types'

export function StoryOptIn({
  optedIn,
  eligible,
  onOptIn,
  preLabel,
  postLabel,
}: OptInTemplateProps): React.JSX.Element {
  return (
    <div
      className="relative mx-auto flex w-full max-w-sm flex-col items-center justify-between overflow-hidden rounded-[var(--radius)] bg-gradient-hero text-card-foreground shadow-glow"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* Decorative halo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/30 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mt-16 px-8 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Limited Time
        </div>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight">
          <AnimatePresence mode="wait">
            <motion.span
              key={optedIn ? 'post' : 'pre'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {optedIn ? postLabel || "You're in!" : preLabel || 'Join the action'}
            </motion.span>
          </AnimatePresence>
        </h2>
      </div>

      <div className="relative z-10 mb-10 w-full px-8">
        <motion.button
          onClick={onOptIn}
          disabled={!eligible || optedIn}
          whileTap={{ scale: 0.97 }}
          animate={!optedIn && eligible ? { boxShadow: [
            '0 0 0 0 hsl(var(--accent) / 0.6)',
            '0 0 0 16px hsl(var(--accent) / 0)',
          ] } : {}}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          className="min-h-[56px] w-full rounded-full bg-primary text-primary-foreground text-lg font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {optedIn ? '✓ Opted In' : 'Count Me In'}
        </motion.button>
        {!eligible && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Not eligible for this campaign
          </div>
        )}
      </div>
    </div>
  )
}
