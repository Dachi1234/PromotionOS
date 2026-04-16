'use client'

/**
 * LuxeWheel — token-driven wheel template.
 *
 * Reads colors / shadows / radii from the active theme tokens, so flipping
 * `themeId` in the store (or via a `?theme=` campaign override) visibly
 * re-skins the whole wheel without per-prop edits.
 *
 * Design intent:
 *  - `bg-gradient-hero` halo behind the disc (each theme paints its own).
 *  - `--shadow-glow` ring that warms up while idle, cools when spinning.
 *  - Slice palette comes from `--primary / --secondary / --accent / --win`
 *    cycling, so a "casino-lux" theme gets jewel-tone slices, "playful"
 *    gets hot pink / cyan, "esports" gets sharp violet / cyan.
 *  - Result-reveal uses the theme's win gradient (`--gradient-win`) + a
 *    `shadow-win` glow instead of hardcoded gold.
 *
 * The inline `accentColor` / `bgColor` props are intentionally ignored —
 * operators who want a one-off palette patch should use the theme override
 * field in Studio, not per-widget color pickers. Those exist for legacy
 * templates only.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'

const VB = 320
const CX = VB / 2

function slicePath(i: number, n: number, r: number): string {
  const a = (2 * Math.PI) / n
  const s = i * a - Math.PI / 2
  const e = s + a - 0.0015
  return `M${CX},${CX}L${CX + r * Math.cos(s)},${CX + r * Math.sin(s)}A${r},${r},0,${a > Math.PI ? 1 : 0},1,${CX + r * Math.cos(e)},${CX + r * Math.sin(e)}Z`
}

function labelXY(i: number, n: number, r: number): { x: number; y: number; rot: number } {
  const a = (2 * Math.PI) / n
  const mid = i * a + a / 2 - Math.PI / 2
  return {
    x: CX + r * 0.66 * Math.cos(mid),
    y: CX + r * 0.66 * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

// Palette slots that cycle from theme tokens. Using HSL custom-prop form so
// every theme re-paints these without touching the component.
const TOKEN_SLICES = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--win))',
  'hsl(var(--progress-fill))',
  'hsl(var(--success))',
]

export function LuxeWheel({
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
  const isIdle = !spinning && !result
  const innerR = CX - 18
  const winIdx = result ? slices.findIndex((s) => s.label === result) : -1

  const sliceColors = useMemo(
    () => slices.map((_, i) => TOKEN_SLICES[i % TOKEN_SLICES.length]),
    [slices],
  )

  const anim = spinning || result || reduced
    ? { rotate: rotation }
    : { rotate: [rotation, rotation + 360] }
  const trans = spinning
    ? { duration: 5, ease: [0.12, 0, 0.05, 1] as [number, number, number, number] }
    : result || reduced
      ? { duration: 0 }
      : { duration: 240, repeat: Infinity, ease: 'linear' as const }

  return (
    <div
      className="relative inline-flex flex-col items-center gap-4 sm:gap-5 p-4 sm:p-8 rounded-[var(--radius)] bg-card text-card-foreground shadow-card bg-gradient-hero w-full max-w-md mx-auto"
      style={{ minWidth: Math.min(wheelSize + 48, 360) }}
    >
      <div
        className="relative rounded-full shadow-glow"
        style={{ width: wheelSize, height: wheelSize }}
      >
        {/* Pointer — inherits the theme's accent */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
          style={{
            width: 0,
            height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: '22px solid hsl(var(--accent))',
            filter: 'drop-shadow(0 2px 6px hsl(var(--accent) / 0.55))',
          }}
        />

        {/* Wheel */}
        <motion.div
          animate={anim}
          transition={trans}
          style={{ width: '100%', height: '100%', willChange: 'transform' }}
        >
          <svg viewBox={`0 0 ${VB} ${VB}`} className="block w-full h-full">
            <defs>
              <radialGradient id="lw-cap">
                <stop offset="0%" stopColor="hsl(var(--card))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </radialGradient>
              <filter id="lw-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Outer rim — uses primary token for a subtle colored ring */}
            <circle
              cx={CX}
              cy={CX}
              r={CX - 3}
              fill="none"
              stroke="hsl(var(--primary) / 0.55)"
              strokeWidth={3}
            />

            {/* Slices */}
            {slices.map((s, i) => (
              <path
                key={i}
                d={slicePath(i, slices.length, innerR)}
                fill={sliceColors[i]}
                stroke="hsl(var(--card))"
                strokeWidth={1}
                style={{
                  filter: winIdx === i
                    ? 'brightness(1.25) drop-shadow(0 0 12px hsl(var(--win)))'
                    : undefined,
                  transition: 'filter 0.5s',
                }}
              />
            ))}

            {/* Labels */}
            {slices.map((s, i) => {
              const p = labelXY(i, slices.length, innerR)
              return (
                <text
                  key={`l${i}`}
                  x={p.x}
                  y={p.y}
                  fill="hsl(var(--primary-foreground))"
                  fontSize={Math.min(14, 200 / slices.length)}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  filter="url(#lw-shadow)"
                  transform={`rotate(${p.rot},${p.x},${p.y})`}
                >
                  {s.label}
                </text>
              )
            })}

            {/* Center cap */}
            <circle
              cx={CX}
              cy={CX}
              r={CX * 0.11}
              fill="url(#lw-cap)"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
            />
          </svg>
        </motion.div>
      </div>

      {/* Result reveal */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 180 }}
          >
            <div className="rounded-full px-6 py-3 bg-gradient-win shadow-win border border-border">
              <span className="text-lg font-bold uppercase tracking-wider text-card-foreground">
                {result}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button — gradient-hero on hover, pulses while idle */}
      <motion.button
        onClick={onSpin}
        disabled={!canSpin}
        whileHover={canSpin ? { scale: 1.03 } : undefined}
        whileTap={canSpin ? { scale: 0.97 } : undefined}
        animate={
          canSpin && isIdle && !reduced
            ? { boxShadow: ['0 0 0 hsl(var(--accent) / 0)', '0 0 24px hsl(var(--accent) / 0.45)', '0 0 0 hsl(var(--accent) / 0)'] }
            : { boxShadow: '0 0 0 hsl(var(--accent) / 0)' }
        }
        transition={{ duration: 2.2, repeat: canSpin && isIdle ? Infinity : 0, ease: 'easeInOut' }}
        className="rounded-full px-8 py-3 min-h-[44px] min-w-[44px] font-bold uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: canSpin ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
          color: canSpin ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
          border: '2px solid hsl(var(--accent) / 0.45)',
        }}
      >
        {canSpin ? spinButtonLabel : 'NO SPINS'}
      </motion.button>

      {/* Spins-remaining chip row */}
      {spinsRemaining !== null && spinsRemaining > 0 && (
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: Math.min(spinsRemaining, 10) }, (_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-gradient-win text-card-foreground shadow-card"
            >
              ★
            </div>
          ))}
          {spinsRemaining > 10 && (
            <span className="text-xs font-semibold text-accent">+{spinsRemaining - 10}</span>
          )}
        </div>
      )}
    </div>
  )
}
