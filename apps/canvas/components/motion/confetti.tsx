'use client'

/**
 * <Confetti> — fires a one-shot burst when the `trigger` prop increments.
 *
 * Pure DOM (no canvas, no package dep) — ~40 absolutely-positioned spans
 * animated via framer-motion. Cheap, scales fine up to 60 particles.
 *
 * Respects reduced-motion: renders nothing when the OS preference is set.
 *
 * Usage:
 *   const [burst, setBurst] = useState(0)
 *   useEffect(() => { if (rewardJustGranted) setBurst(n => n + 1) }, [...])
 *   <Confetti trigger={burst} />
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const PARTICLE_COUNT = 40
const COLORS = [
  'hsl(var(--win))',
  'hsl(var(--accent))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
]

interface Particle {
  id: number
  x: number
  y: number
  rotate: number
  color: string
  size: number
}

function makeBurst(seed: number): Particle[] {
  // Deterministic-ish (seed + index) so the burst is stable across re-renders
  // within the same trigger value — prevents flickering if React re-renders
  // mid-animation.
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const rand = (n: number): number => {
      const x = Math.sin(seed * 1000 + i * (n + 1)) * 10000
      return x - Math.floor(x)
    }
    return {
      id: i,
      x: (rand(1) - 0.5) * 480,
      y: -rand(2) * 360 - 80,
      rotate: (rand(3) - 0.5) * 720,
      color: COLORS[Math.floor(rand(4) * COLORS.length)]!,
      size: 6 + rand(5) * 6,
    }
  })
}

export function Confetti({ trigger }: { trigger: number }): React.JSX.Element | null {
  const reduced = useReducedMotion()
  const [particles, setParticles] = useState<Particle[] | null>(null)

  useEffect(() => {
    if (reduced || trigger <= 0) return
    setParticles(makeBurst(trigger))
    const t = setTimeout(() => setParticles(null), 1800)
    return () => clearTimeout(t)
  }, [trigger, reduced])

  if (reduced || !particles) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: 2,
                left: 0,
                top: 0,
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
