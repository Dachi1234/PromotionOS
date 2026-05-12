'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * Jackpot wheel — Vegas-casino spin variant. A dense 12-slice wheel with
 * intense gold/crimson gradient fills, a blinking halo of bulbs around the
 * rim, and a giant "JACKPOT" badge centred over the hub. Designed for
 * high-stakes promos where the wheel is the hero component and other
 * widgets cluster around it.
 *
 * Uses the shared `WheelTemplateProps` contract so the same `slices`,
 * `rotation`, and `onSpin` wiring that drives the Classic/Modern/Neon
 * wheels powers this one — only the paint changes.
 */

const VB = 320
const CX = VB / 2
const LAMP_COUNT = 36

function slicePath(i: number, n: number, r: number) {
  const a = (2 * Math.PI) / n
  const s = i * a - Math.PI / 2
  const e = s + a - 0.001
  return `M${CX},${CX}L${CX + r * Math.cos(s)},${CX + r * Math.sin(s)}A${r},${r},0,${a > Math.PI ? 1 : 0},1,${CX + r * Math.cos(e)},${CX + r * Math.sin(e)}Z`
}

function labelXY(i: number, n: number, r: number) {
  const a = (2 * Math.PI) / n
  const mid = i * a + a / 2 - Math.PI / 2
  return {
    x: CX + r * 0.62 * Math.cos(mid),
    y: CX + r * 0.62 * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

export function JackpotWheel({
  slices, rotation, spinning, canSpin, spinsRemaining,
  onSpin, spinButtonLabel, spinButtonColor,
  spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
  spinButtonPaddingX, spinButtonPaddingY,
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const count = slices.length || 12
  const R = 140

  // Classic "slot-floor" palette — alternating crimson / near-black with
  // gold highlights. Overrides the slice.color palette to keep the jackpot
  // identity consistent regardless of upstream config.
  const slicePalette = ['#A11E2B', '#0E0B10', '#C9A24B', '#0E0B10', '#A11E2B', '#0E0B10', '#C9A24B', '#0E0B10', '#A11E2B', '#0E0B10', '#C9A24B', '#0E0B10']
  const filled = Array.from({ length: count }, (_, i) => ({
    label: slices[i]?.label ?? `$${(i + 1) * 100}`,
    color: slicePalette[i % slicePalette.length],
  }))

  return (
    <div
      // Width comes from the parent (ResizableWrapper's `_w`). The outer
      // div is 100% wide; the inner square (aspectRatio: 1/1) keeps the
      // wheel round at every breakpoint with no fixed-px dependency.
      className="relative mx-auto flex flex-col items-center justify-start"
      style={{ width: '100%' }}
    >
      {/* Ambient jackpot glow. Pulsing gold aura behind the whole wheel. */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -40,
          background: 'radial-gradient(circle at 50% 45%, rgba(201,162,75,0.55) 0%, rgba(161,30,43,0.22) 45%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
        animate={reduced ? undefined : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
        {/* Outer gold rim */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #5C3A00, #C9A24B, #F8E7A0, #C9A24B, #5C3A00, #C9A24B, #F8E7A0, #C9A24B, #5C3A00)',
            boxShadow: '0 0 0 1px #5C3A00 inset, 0 8px 30px -6px rgba(201,162,75,0.6), 0 0 40px -4px rgba(201,162,75,0.4)',
          }}
        />
        {/* Blinking bulbs along the rim. Positions expressed as percentages
            of the square container so they ride the rim at any size — no
            more fixed-px math tied to a `wheelSize` prop. */}
        {Array.from({ length: LAMP_COUNT }).map((_, i) => {
          const a = (i / LAMP_COUNT) * Math.PI * 2
          // Rim radius ≈ 48% of container (outer edge is 50%, pull in a
          // hair to sit inside the gold conic gradient).
          const rr = 48
          const left = `calc(50% + ${rr * Math.cos(a)}% - 3px)`
          const top = `calc(50% + ${rr * Math.sin(a)}% - 3px)`
          return (
            <motion.span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                left, top,
                width: 6, height: 6,
                borderRadius: '50%',
                background: i % 2 ? '#FFE48B' : '#FFFFFF',
                boxShadow: '0 0 6px rgba(255,228,139,0.9)',
              }}
              animate={reduced ? undefined : { opacity: i % 2 ? [0.4, 1, 0.4] : [1, 0.4, 1] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
            />
          )
        })}

        {/* Wheel itself — inset ~5.5% to sit inside the gold rim, same as
            the other templates use a percentage inset. */}
        <div style={{ position: 'absolute', inset: '5.5%' }}>
          <motion.svg
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: '100%', height: '100%' }}
            animate={{ rotate: rotation }}
            transition={{ duration: reduced ? 0.3 : 4.6, ease: [0.15, 0.8, 0.2, 1] }}
          >
            <defs>
              <radialGradient id="jackpot-sheen" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            {filled.map((s, i) => (
              <g key={i}>
                <path d={slicePath(i, count, R)} fill={s.color} stroke="#C9A24B" strokeWidth={1.2} />
              </g>
            ))}
            <circle cx={CX} cy={CX} r={R} fill="url(#jackpot-sheen)" pointerEvents="none" />
            {filled.map((s, i) => {
              const { x, y, rot } = labelXY(i, count, R)
              return (
                <text
                  key={`lbl-${i}`}
                  x={x} y={y}
                  fontSize={10}
                  fontWeight={700}
                  fill="#FFE48B"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${rot} ${x} ${y})`}
                  style={{ fontFamily: 'var(--font-display, system-ui)' }}
                >
                  {s.label.length > 10 ? s.label.slice(0, 9) + '…' : s.label}
                </text>
              )
            })}
            {/* Gold pegs at slice boundaries */}
            {Array.from({ length: count }).map((_, i) => {
              const a = (i / count) * Math.PI * 2 - Math.PI / 2
              return (
                <circle
                  key={`peg-${i}`}
                  cx={CX + (R - 4) * Math.cos(a)}
                  cy={CX + (R - 4) * Math.sin(a)}
                  r={3}
                  fill="#FFE48B"
                  stroke="#5C3A00"
                  strokeWidth={0.5}
                />
              )
            })}
          </motion.svg>
        </div>

        {/* Centre JACKPOT badge — 36% of container width keeps it
            proportional on every viewport. Text scales via clamp() so it
            stays legible on phones without ballooning on ultrawide. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '36%', aspectRatio: '1 / 1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #1A1013 0%, #0B0608 100%)',
            boxShadow: '0 0 0 3px #C9A24B, 0 0 0 5px #5C3A00, 0 0 24px rgba(201,162,75,0.5)',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            color: '#FFE48B',
            fontFamily: 'var(--font-display, serif)',
          }}
        >
          <div>
            <div style={{ fontSize: 'clamp(7px, 1.4cqw, 11px)', letterSpacing: '0.3em', opacity: 0.7 }}>WIN THE</div>
            <div style={{ fontSize: 'clamp(14px, 3cqw, 22px)', fontWeight: 900, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(255,228,139,0.6)' }}>JACKPOT</div>
          </div>
        </div>

        {/* Pointer at top */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -6, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '22px solid #C9A24B',
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin || spinning}
        style={{
          // Template default = gold Vegas pill; operator props override.
          marginTop: 24,
          padding: `${spinButtonPaddingY ?? 12}px ${spinButtonPaddingX ?? 28}px`,
          fontSize: spinButtonFontSize ?? fluidSize(13, 17),
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: spinButtonTextColor ?? '#1A0C00',
          background: spinButtonColor
            ? `linear-gradient(180deg, ${spinButtonColor} 0%, ${spinButtonColor} 100%)`
            : 'linear-gradient(180deg, #F8E7A0 0%, #C9A24B 55%, #8A6A1F 100%)',
          border: '1px solid #5C3A00',
          borderRadius: spinButtonRadius ?? 999,
          cursor: canSpin && !spinning ? 'pointer' : 'not-allowed',
          opacity: canSpin && !spinning ? 1 : 0.55,
          boxShadow: '0 6px 16px -4px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,228,139,0.5) inset',
          fontFamily: 'var(--font-display, serif)',
        }}
      >
        {spinning ? 'Spinning…' : spinButtonLabel}
      </button>
      {spinsRemaining != null && (
        <div style={{ marginTop: 8, fontSize: fluidSize(10, 12), color: '#C9A24B', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} left
        </div>
      )}
    </div>
  )
}
