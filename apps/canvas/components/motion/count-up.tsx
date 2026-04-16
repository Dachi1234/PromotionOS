'use client'

/**
 * <CountUp> — animates a numeric value from its previous render to the
 * current one. Use it for stats, progress readouts, coin counters, rank
 * deltas — anything where "it changed" is meaningful feedback.
 *
 * Respects `prefers-reduced-motion`: snaps to the new value instantly
 * when the user has reduced-motion enabled.
 *
 * Usage:
 *   <CountUp value={player.coins} format={(n) => `${n.toLocaleString()} GEL`} />
 */

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { formatAbbreviated, formatNumber } from '@/lib/format'

export interface CountUpProps {
  value: number
  /** Duration in ms. Defaults to 900 — long enough to be readable, short
   *  enough not to block the eye on subsequent updates. */
  durationMs?: number
  /** How to format the current tick. Defaults to locale-aware integer. */
  format?: (n: number) => string
  className?: string
  /** When true (default), starts from the previous value. When false, starts
   *  from 0 — useful for first-render splash animations. */
  fromPrevious?: boolean
  /** Convenience: when set, uses `Intl.NumberFormat` compact notation
   *  (`12.5K`) instead of the default full-grouping format. Ignored if
   *  `format` is also provided. */
  abbreviated?: boolean
  /** BCP-47 locale passed into the default formatter. */
  locale?: string
}

export function CountUp({
  value,
  durationMs = 900,
  format,
  className,
  fromPrevious = true,
  abbreviated = false,
  locale = 'en',
}: CountUpProps): React.JSX.Element {
  const resolvedFormat = format ?? ((n: number) =>
    abbreviated ? formatAbbreviated(n, locale) : formatNumber(Math.round(n), locale))
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState<number>(value)
  const previousRef = useRef<number>(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromPrevious ? previousRef.current : 0
    const to = value
    previousRef.current = value

    if (reduced || from === to) {
      setDisplay(to)
      return
    }

    const start = performance.now()
    const tick = (now: number): void => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      // easeOutCubic — overshoots feel wrong on monetary values.
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs, reduced, fromPrevious])

  return <span className={className}>{resolvedFormat(display)}</span>
}
