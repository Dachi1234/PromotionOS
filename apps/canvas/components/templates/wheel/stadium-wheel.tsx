'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * Stadium Wheel — serious sportsbook / casino hybrid style. Modelled on
 * real operator promos (e.g. CrocoBet's "ბორბალი" football promo): deep
 * navy base, polished gold outer rim with rivets, two concentric rings
 * (outer brand / prizes, inner multipliers), central green infinity hub,
 * green pill spin button.
 *
 * The emphasis is on depth and materiality — gradients to fake metal,
 * shadow rings for the bevel, subtle radial sheen across the wheel face.
 * Nothing cartoonish, no emoji.
 *
 * Contract: reads the same `WheelTemplateProps` as the other wheels so it
 * can be swapped into TEMPLATE_MAP without touching widget code.
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

export function StadiumWheel({
  slices, rotation, spinning, canSpin, spinsRemaining,
  onSpin, spinButtonLabel, spinButtonColor,
  spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
  spinButtonPaddingX, spinButtonPaddingY,
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const outerCount = Math.max(8, slices.length || 12)
  const innerCount = 6 // fixed multiplier ring

  // Outer ring uses provided prize labels; inner ring is fixed multipliers.
  const outer = Array.from({ length: outerCount }, (_, i) => ({
    label: slices[i]?.label ?? ['500', '1000', '250', '5000', '50', '100', '25', '2000', '15', '150', '1000', '500'][i % 12]!,
  }))
  const multipliers = ['20X', '1X', '2X', '5X', '10X', '15X']

  const RIM_GOLD = '#C9A24B'
  const RIM_DARK = '#5C3A00'
  const RIM_HIGHLIGHT = '#F8E7A0'
  const SLICE_DARK_GREEN = '#103A2A'
  const SLICE_GREEN = '#1E6B4A'
  const SLICE_NAVY = '#0F2447'
  const SLICE_NAVY_DARK = '#081734'
  const HUB_GREEN = '#1DB954'

  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-start"
      style={{ width: '100%' }}
    >
      {/* Ambient stadium glow — cool emerald cast. */}
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
        {/* Outer gold rim with radial metallic gradient. */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${RIM_DARK}, ${RIM_GOLD}, ${RIM_HIGHLIGHT}, ${RIM_GOLD}, ${RIM_DARK}, ${RIM_GOLD}, ${RIM_HIGHLIGHT}, ${RIM_GOLD}, ${RIM_DARK})`,
            boxShadow: `
              0 0 0 1px ${RIM_DARK} inset,
              0 12px 40px -10px rgba(0,0,0,0.7),
              0 0 60px -10px rgba(201,162,75,0.35)
            `,
          }}
        />
        {/* Rivets around the rim. */}
        {Array.from({ length: RIVET_COUNT }).map((_, i) => {
          const a = (i / RIVET_COUNT) * Math.PI * 2 - Math.PI / 2
          const rr = 0.5 - 0.028 // percentage from center
          const left = `calc(50% + ${rr * 100}% * ${Math.cos(a)})`
          const top = `calc(50% + ${rr * 100}% * ${Math.sin(a)})`
          return (
            <span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                left, top,
                width: 6, height: 6,
                marginLeft: -3, marginTop: -3,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${RIM_HIGHLIGHT}, ${RIM_DARK})`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
              }}
            />
          )
        })}

        {/* Wheel face — inset inside the rim. */}
        <div style={{ position: 'absolute', inset: '6%' }}>
          <motion.svg
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
            animate={{ rotate: rotation }}
            transition={{ duration: reduced ? 0.3 : 4.8, ease: [0.15, 0.8, 0.2, 1] }}
          >
            <defs>
              <radialGradient id="stadium-face-sheen" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
              </radialGradient>
              <radialGradient id="stadium-hub" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#2FDF6E" />
                <stop offset="60%" stopColor={HUB_GREEN} />
                <stop offset="100%" stopColor="#0E6A32" />
              </radialGradient>
            </defs>

            {/* Base disc */}
            <circle cx={CX} cy={CX} r={150} fill={SLICE_NAVY_DARK} />

            {/* Outer prize ring — alternating dark green / deep navy. */}
            {outer.map((s, i) => (
              <g key={`o-${i}`}>
                <path
                  d={arcPath(i, outerCount, 150, 104)}
                  fill={i % 2 === 0 ? SLICE_DARK_GREEN : SLICE_NAVY}
                  stroke={RIM_GOLD}
                  strokeWidth={0.8}
                />
              </g>
            ))}
            {/* Outer labels */}
            {outer.map((s, i) => {
              const { x, y, rot } = labelXY(i, outerCount, 127)
              const short = s.label.length > 8 ? s.label.slice(0, 7) + '…' : s.label
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

            {/* Divider ring */}
            <circle cx={CX} cy={CX} r={104} fill="none" stroke={RIM_GOLD} strokeWidth={1.5} opacity={0.8} />

            {/* Inner multiplier ring — brighter greens to read as the "prize" layer. */}
            {multipliers.map((m, i) => (
              <g key={`i-${i}`}>
                <path
                  d={arcPath(i, innerCount, 103, 56)}
                  fill={i % 2 === 0 ? SLICE_NAVY : SLICE_GREEN}
                  stroke={RIM_GOLD}
                  strokeWidth={0.6}
                />
              </g>
            ))}
            {multipliers.map((m, i) => {
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
                  {m}
                </text>
              )
            })}

            {/* Inner divider + sheen overlay */}
            <circle cx={CX} cy={CX} r={56} fill="none" stroke={RIM_GOLD} strokeWidth={1.2} opacity={0.85} />
            <circle cx={CX} cy={CX} r={150} fill="url(#stadium-face-sheen)" pointerEvents="none" />

            {/* Central green hub with brand infinity-ish glyph */}
            <circle cx={CX} cy={CX} r={44} fill="url(#stadium-hub)" stroke={RIM_GOLD} strokeWidth={2} />
            <circle cx={CX} cy={CX} r={44} fill="none" stroke={RIM_DARK} strokeWidth={0.5} />
            <g transform={`translate(${CX - 14} ${CX - 8})`}>
              {/* Simple infinity-ish mark — two overlapping circles */}
              <circle cx={9} cy={8} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
              <circle cx={19} cy={8} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
            </g>
          </motion.svg>
        </div>

        {/* Pointer at top — gold drop shape. */}
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
          // Operator overrides take precedence; unset falls through to the
          // template's signature look (gold-rim green pill).
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
          boxShadow: `
            0 8px 22px -6px rgba(29,185,84,0.55),
            0 0 0 1px rgba(255,255,255,0.25) inset,
            0 -2px 0 rgba(0,0,0,0.25) inset
          `,
          fontFamily: 'var(--font-display, system-ui)',
        }}
      >
        {spinning ? 'Spinning…' : spinButtonLabel || 'Spin'}
      </button>
      {spinsRemaining != null && (
        <div
          style={{
            marginTop: 10,
            fontSize: fluidSize(10, 12),
            color: '#9FB3C8',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} remaining
        </div>
      )}
    </div>
  )
}
