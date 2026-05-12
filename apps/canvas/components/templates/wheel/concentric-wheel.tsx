'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * Concentric Wheel — Crocobet-style "wheel in a wheel" for compound
 * reward + condition reveals.
 *
 * The two rings rotate INDEPENDENTLY and SEQUENTIALLY:
 *   1. Click spin → outer ring spins to reveal the reward.
 *   2. Outer settles → inner ring spins to reveal the condition paired
 *      with that reward (1:1 — condition is attached to the reward in
 *      the backend data model, not randomly drawn).
 *   3. Compound reveal modal surfaces "You won X · to claim, do Y".
 *
 * This component only draws the wheel; the orchestration (timing, reveal)
 * lives in `WheelWidget` so all templates can opt into the same flow.
 * Outer uses `rotation`, inner uses `innerRotation` — both supplied by
 * the widget. Stationary SVG elements (background, hub, sheen) are
 * NOT inside either rotating group so they don't wobble.
 *
 * Authoring contract: for compound rewards, author inner slice count =
 * outer slice count, each inner slice labelled with the condition for
 * the matching outer reward. WheelWidget's index math modulos into the
 * inner count if they differ, so the animation still lands on-wheel.
 */

const VB = 320
const CX = VB / 2
const RIVET_COUNT = 16

function arcPath(i: number, n: number, rOuter: number, rInner: number) {
  const a = (2 * Math.PI) / n
  const s = i * a - Math.PI / 2
  const e = s + a - 0.002
  const x1o = CX + rOuter * Math.cos(s), y1o = CX + rOuter * Math.sin(s)
  const x2o = CX + rOuter * Math.cos(e), y2o = CX + rOuter * Math.sin(e)
  const x1i = CX + rInner * Math.cos(e), y1i = CX + rInner * Math.sin(e)
  const x2i = CX + rInner * Math.cos(s), y2i = CX + rInner * Math.sin(s)
  return `M${x1o},${y1o} A${rOuter},${rOuter},0,0,1,${x2o},${y2o} L${x1i},${y1i} A${rInner},${rInner},0,0,0,${x2i},${y2i} Z`
}

function labelXY(i: number, n: number, r: number) {
  const a = (2 * Math.PI) / n
  const mid = i * a + a / 2 - Math.PI / 2
  return {
    x: CX + r * Math.cos(mid),
    y: CX + r * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

const DEFAULT_MULTIPLIERS = [
  { label: '20X', color: '#0F2447' }, { label: '1X', color: '#1E6B4A' },
  { label: '2X', color: '#0F2447' }, { label: '5X', color: '#1E6B4A' },
  { label: '10X', color: '#0F2447' }, { label: '15X', color: '#1E6B4A' },
]

export function ConcentricWheel({
  slices, innerSlices, rotation, innerRotation = 0,
  spinning, canSpin, spinsRemaining,
  onSpin, spinButtonLabel, spinButtonColor,
  spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
  spinButtonPaddingX, spinButtonPaddingY,
}: WheelTemplateProps) {
  const reduced = useReducedMotion()

  const outer = slices.length > 0 ? slices : Array.from({ length: 10 }, (_, i) => ({
    label: ['500', '15', '50', '25', '100', '150', '250', '1000', '2000', '5000'][i] || `P${i + 1}`,
    color: i % 2 === 0 ? '#103A2A' : '#0F2447',
  }))
  const inner = innerSlices && innerSlices.length > 0 ? innerSlices : DEFAULT_MULTIPLIERS
  const outerCount = outer.length
  const innerCount = inner.length

  const RIM_GOLD = '#C9A24B'
  const RIM_DARK = '#5C3A00'
  const RIM_HIGHLIGHT = '#F8E7A0'
  const HUB_GREEN = '#1DB954'

  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-start"
      style={{ width: '100%' }}
    >
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -30,
          background: 'radial-gradient(circle at 50% 45%, rgba(29,185,84,0.18) 0%, rgba(15,36,71,0.35) 45%, transparent 75%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
        }}
        animate={reduced ? undefined : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
        {/* Gold rim */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${RIM_DARK}, ${RIM_GOLD}, ${RIM_HIGHLIGHT}, ${RIM_GOLD}, ${RIM_DARK}, ${RIM_GOLD}, ${RIM_HIGHLIGHT}, ${RIM_GOLD}, ${RIM_DARK})`,
            boxShadow: `0 0 0 1px ${RIM_DARK} inset, 0 12px 40px -10px rgba(0,0,0,0.7), 0 0 60px -10px rgba(201,162,75,0.35)`,
          }}
        />
        {Array.from({ length: RIVET_COUNT }).map((_, i) => {
          const a = (i / RIVET_COUNT) * Math.PI * 2 - Math.PI / 2
          const rr = 0.5 - 0.028
          const left = `calc(50% + ${rr * 100}% * ${Math.cos(a)})`
          const top = `calc(50% + ${rr * 100}% * ${Math.sin(a)})`
          return (
            <span
              key={i}
              aria-hidden
              style={{
                position: 'absolute', left, top,
                width: 6, height: 6, marginLeft: -3, marginTop: -3,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${RIM_HIGHLIGHT}, ${RIM_DARK})`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            />
          )
        })}

        <div style={{ position: 'absolute', inset: '6%' }}>
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              <radialGradient id="concentric-sheen" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
              </radialGradient>
              <radialGradient id="concentric-hub" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#2FDF6E" />
                <stop offset="60%" stopColor={HUB_GREEN} />
                <stop offset="100%" stopColor="#0E6A32" />
              </radialGradient>
            </defs>

            {/* Static backdrop — does NOT rotate (otherwise the sheen
                would spin with the wheel which looks wrong). */}
            <circle cx={CX} cy={CX} r={150} fill="#081734" />

            {/*
              Outer ring. Wrapped in its own motion group so it can spin
              independently of the inner ring. `transformOrigin` anchors
              the rotation on the wheel centre; framer-motion needs it
              expressed as SVG user coordinates (px) inside `style`.
              Duration matches OUTER_SPIN_MS in WheelWidget (4000ms).
            */}
            <motion.g
              animate={{ rotate: rotation }}
              transition={{ duration: reduced ? 0.3 : 4, ease: [0.15, 0.8, 0.2, 1] }}
              style={{ transformOrigin: `${CX}px ${CX}px` }}
            >
              {outer.map((s, i) => (
                <path
                  key={`o-${i}`}
                  d={arcPath(i, outerCount, 150, 104)}
                  fill={s.color || (i % 2 === 0 ? '#103A2A' : '#0F2447')}
                  stroke={RIM_GOLD}
                  strokeWidth={0.8}
                />
              ))}
              {outer.map((s, i) => {
                const { x, y, rot } = labelXY(i, outerCount, 127)
                const short = s.label.length > 10 ? s.label.slice(0, 9) + '…' : s.label
                return (
                  <text
                    key={`ol-${i}`}
                    x={x} y={y}
                    fontSize={11}
                    fontWeight={700}
                    fill="#F3F6FA"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rot} ${x} ${y})`}
                    style={{ fontFamily: 'var(--font-display, system-ui)', letterSpacing: '0.02em' }}
                  >
                    {short}
                  </text>
                )
              })}
            </motion.g>

            {/* Divider ring between outer and inner — static. */}
            <circle cx={CX} cy={CX} r={104} fill="none" stroke={RIM_GOLD} strokeWidth={1.5} opacity={0.8} />

            {/*
              Inner ring — independent rotation. In the compound reveal
              flow this kicks off AFTER the outer settles (see
              WheelWidget.handleSpin) so the player reads reward first,
              condition second. Duration matches INNER_SPIN_MS (2800ms).
            */}
            <motion.g
              animate={{ rotate: innerRotation }}
              transition={{ duration: reduced ? 0.25 : 2.8, ease: [0.15, 0.8, 0.2, 1] }}
              style={{ transformOrigin: `${CX}px ${CX}px` }}
            >
              {inner.map((s, i) => (
                <path
                  key={`i-${i}`}
                  d={arcPath(i, innerCount, 103, 56)}
                  fill={s.color || (i % 2 === 0 ? '#0F2447' : '#1E6B4A')}
                  stroke={RIM_GOLD}
                  strokeWidth={0.6}
                />
              ))}
              {inner.map((s, i) => {
                const { x, y, rot } = labelXY(i, innerCount, 80)
                return (
                  <text
                    key={`il-${i}`}
                    x={x} y={y}
                    fontSize={14}
                    fontWeight={800}
                    fill="#FFFFFF"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rot} ${x} ${y})`}
                    style={{ fontFamily: 'var(--font-display, system-ui)', letterSpacing: '0.04em' }}
                  >
                    {s.label}
                  </text>
                )
              })}
            </motion.g>

            {/* Hub + sheen — static so the chrome doesn't spin. */}
            <circle cx={CX} cy={CX} r={56} fill="none" stroke={RIM_GOLD} strokeWidth={1.2} opacity={0.85} />
            <circle cx={CX} cy={CX} r={150} fill="url(#concentric-sheen)" pointerEvents="none" />
            <circle cx={CX} cy={CX} r={44} fill="url(#concentric-hub)" stroke={RIM_GOLD} strokeWidth={2} />
            <g transform={`translate(${CX - 14} ${CX - 8})`}>
              <circle cx={9} cy={8} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
              <circle cx={19} cy={8} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
            </g>
          </svg>
        </div>

        {/* Pointer */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -4, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: `26px solid ${HUB_GREEN}`,
            filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.55))',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -10, left: '50%',
            transform: 'translateX(-50%)',
            width: 16, height: 16,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, #2FDF6E, ${HUB_GREEN})`,
            boxShadow: `0 0 0 2px ${RIM_GOLD}, 0 2px 4px rgba(0,0,0,0.5)`,
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin || spinning}
        style={{
          // Operator overrides (props) win over template defaults. Zero /
          // undefined falls through to the signature concentric green pill.
          marginTop: 28,
          padding: `${spinButtonPaddingY ?? 14}px ${spinButtonPaddingX ?? 48}px`,
          fontSize: spinButtonFontSize ?? fluidSize(13, 17),
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: spinButtonTextColor ?? '#062A15',
          background: spinButtonColor
            ? `linear-gradient(180deg, ${spinButtonColor} 0%, ${spinButtonColor} 100%)`
            : `linear-gradient(180deg, #2FDF6E 0%, ${HUB_GREEN} 60%, #0E6A32 100%)`,
          border: `1px solid ${HUB_GREEN}`,
          borderRadius: spinButtonRadius ?? 999,
          cursor: canSpin && !spinning ? 'pointer' : 'not-allowed',
          opacity: canSpin && !spinning ? 1 : 0.45,
          boxShadow: `0 8px 22px -6px rgba(29,185,84,0.55), 0 0 0 1px rgba(255,255,255,0.25) inset, 0 -2px 0 rgba(0,0,0,0.25) inset`,
          fontFamily: 'var(--font-display, system-ui)',
        }}
      >
        {spinning ? 'Spinning…' : spinButtonLabel || 'Spin'}
      </button>
      {spinsRemaining != null && (
        <div style={{ marginTop: 10, fontSize: fluidSize(10, 12), color: '#9FB3C8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
          {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} remaining
        </div>
      )}
    </div>
  )
}
