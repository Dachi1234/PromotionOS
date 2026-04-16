'use client'

/**
 * LuxeOptIn — token-driven opt-in CTA.
 *
 * Big friendly button that pulses with the theme's accent glow. When the
 * player is opted in it morphs into a "You're in" success badge.
 */

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import type { OptInTemplateProps } from '../shared-types'

export function LuxeOptIn({
  optedIn,
  eligible,
  onOptIn,
  preLabel,
  postLabel,
}: OptInTemplateProps): React.JSX.Element {
  const reduced = useReducedMotion()

  return (
    <div className="rounded-[var(--radius)] bg-card text-card-foreground border border-border shadow-card p-4 sm:p-6 flex flex-col items-center text-center w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {optedIn ? (
          <motion.div
            key="in"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-success text-white flex items-center justify-center text-2xl shadow-glow">
              ✓
            </div>
            <div>
              <div className="font-bold text-lg">{postLabel}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Good luck — prizes inbound.
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="out"
            onClick={onOptIn}
            disabled={!eligible}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={
              eligible && !reduced
                ? {
                    scale: 1,
                    opacity: 1,
                    boxShadow: [
                      '0 0 0 hsl(var(--accent) / 0)',
                      '0 0 32px hsl(var(--accent) / 0.45)',
                      '0 0 0 hsl(var(--accent) / 0)',
                    ],
                  }
                : { scale: 1, opacity: 1 }
            }
            whileHover={eligible ? { scale: 1.04 } : undefined}
            whileTap={eligible ? { scale: 0.97 } : undefined}
            transition={{
              boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              scale: { type: 'spring', damping: 14 },
            }}
            className="rounded-full px-8 sm:px-10 py-4 min-h-[44px] min-w-[44px] text-base font-bold uppercase tracking-wider bg-gradient-hero text-primary-foreground border-2 border-accent/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {preLabel}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
