'use client'

/**
 * <PulseOn> — wraps content with a brief "something just happened here" pulse
 * when the `watch` value changes. Use for progress bars, stat readouts,
 * reward cards — anything the user should notice was updated.
 *
 * The default pulse tints the element with `--accent` at 15% for ~600ms.
 * Pass `tone="win"` for gold/win pulses (`--win` token) on terminal rewards.
 */

import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

export function PulseOn({
  watch,
  children,
  tone = 'accent',
  className,
}: {
  watch: unknown
  children: ReactNode
  tone?: 'accent' | 'win' | 'success'
  className?: string
}): React.JSX.Element {
  const controls = useAnimationControls()
  const reduced = useReducedMotion()
  const prev = useRef(watch)

  useEffect(() => {
    if (prev.current === watch) return
    prev.current = watch
    if (reduced) return
    const color =
      tone === 'win' ? 'hsl(var(--win) / 0.25)'
      : tone === 'success' ? 'hsl(var(--success) / 0.2)'
      : 'hsl(var(--accent) / 0.15)'
    controls.start({
      backgroundColor: ['transparent', color, 'transparent'],
      transition: { duration: 0.7, ease: 'easeOut' },
    })
  }, [watch, controls, reduced, tone])

  return (
    <motion.div animate={controls} className={className}>
      {children}
    </motion.div>
  )
}
