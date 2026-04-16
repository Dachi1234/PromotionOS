'use client'

/**
 * Story-mode wheel — 9:16 vertical full-bleed render. Designed for
 * mobile Stories/Reels embeds or standalone "fullscreen spin" pages.
 *
 * Layout:
 *   ┌─────────────────┐   top strip: campaign-owned branding slot
 *   │    CAMPAIGN     │
 *   │                 │
 *   │      ◯ wheel    │   hero: wheel centred vertically
 *   │                 │
 *   │   [ SPIN NOW ]  │   primary CTA fixed near bottom (thumb zone)
 *   │   3 spins left  │
 *   └─────────────────┘
 *
 * All colors resolve from theme tokens.
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'

export function StoryWheel({
  slices,
  rotation,
  spinning,
  result,
  canSpin,
  spinsRemaining,
  onSpin,
  wheelSize,
  spinButtonLabel,
}: WheelTemplateProps): React.JSX.Element {
  const reduced = useReducedMotion()
  const size = Math.min(wheelSize, 320)

  const TOKEN_SLICES = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--win))',
    'hsl(var(--primary) / 0.7)',
    'hsl(var(--accent) / 0.7)',
  ]

  return (
    <div
      className="relative mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-[var(--radius)] bg-gradient-hero text-card-foreground shadow-glow"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* Top brand strip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Spin to Win
        </div>
        {spinsRemaining !== null && (
          <div className="rounded-full bg-card/80 px-3 py-1 text-xs font-semibold backdrop-blur">
            {spinsRemaining} left
          </div>
        )}
      </div>

      {/* Hero wheel */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative" style={{ width: size, height: size }}>
          <motion.svg
            viewBox="0 0 200 200"
            width={size}
            height={size}
            animate={{ rotate: reduced ? 0 : rotation }}
            transition={{ duration: spinning ? 5 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: 'drop-shadow(0 10px 40px hsl(var(--primary) / 0.35))' }}
          >
            {slices.map((s, i) => {
              const color = s.color || TOKEN_SLICES[i % TOKEN_SLICES.length]
              const angle = (360 / slices.length) * i - 90
              const endAngle = angle + 360 / slices.length
              const r = 95
              const x1 = 100 + r * Math.cos((angle * Math.PI) / 180)
              const y1 = 100 + r * Math.sin((angle * Math.PI) / 180)
              const x2 = 100 + r * Math.cos((endAngle * Math.PI) / 180)
              const y2 = 100 + r * Math.sin((endAngle * Math.PI) / 180)
              const midAngle = (angle + endAngle) / 2
              const labelR = 60
              const lx = 100 + labelR * Math.cos((midAngle * Math.PI) / 180)
              const ly = 100 + labelR * Math.sin((midAngle * Math.PI) / 180)
              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                    fill={color}
                    stroke="hsl(var(--card))"
                    strokeWidth={1.5}
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="hsl(var(--card-foreground))"
                    transform={`rotate(${midAngle + 90}, ${lx}, ${ly})`}
                  >
                    {s.label}
                  </text>
                </g>
              )
            })}
            <circle cx={100} cy={100} r={10} fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth={2} />
          </motion.svg>
          {/* Pointer */}
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2"
            aria-hidden
            style={{
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '20px solid hsl(var(--accent))',
              filter: 'drop-shadow(0 2px 4px hsl(var(--accent) / 0.6))',
            }}
          />
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className="mx-5 mb-3 rounded-xl bg-gradient-win px-4 py-3 text-center shadow-win">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            You won
          </div>
          <div className="text-xl font-bold">{result}</div>
        </div>
      )}

      {/* CTA — thumb zone */}
      <div className="px-5 pb-6">
        <motion.button
          onClick={onSpin}
          disabled={!canSpin || spinning}
          whileTap={{ scale: 0.97 }}
          animate={canSpin && !spinning ? { boxShadow: [
            '0 0 0 0 hsl(var(--accent) / 0.6)',
            '0 0 0 14px hsl(var(--accent) / 0)',
          ] } : {}}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          className="min-h-[56px] w-full rounded-full bg-primary text-primary-foreground text-lg font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {spinning ? 'Spinning…' : spinButtonLabel || 'Spin Now'}
        </motion.button>
      </div>
    </div>
  )
}
