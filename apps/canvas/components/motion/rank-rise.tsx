'use client'

/**
 * <RankRise> — wraps a leaderboard list so that items smoothly re-order when
 * the underlying array changes. Leverages framer-motion's layout animation.
 *
 * Usage:
 *   <RankRise>
 *     {entries.map((e) => (
 *       <RankItem key={e.playerId} ...>...</RankItem>
 *     ))}
 *   </RankRise>
 *
 * Each child MUST have a stable `key` that represents the player, not the
 * rank — otherwise framer-motion can't animate the reorder, it'll just
 * swap content in place.
 */

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export function RankRise({ children }: { children: ReactNode }): React.JSX.Element {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <LayoutGroup>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </LayoutGroup>
  )
}

/** Companion for individual list rows — handles enter/exit + layout shift. */
export function RankItem({
  itemKey,
  children,
  className,
  highlight,
}: {
  itemKey: string
  children: ReactNode
  className?: string
  /** When true, briefly pulses the row background (e.g. "this is you"). */
  highlight?: boolean
}): React.JSX.Element {
  return (
    <motion.div
      key={itemKey}
      layout
      layoutId={itemKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: highlight ? 'hsl(var(--accent) / 0.08)' : 'transparent',
      }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
