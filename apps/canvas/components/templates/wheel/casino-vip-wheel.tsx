'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * Casino VIP Wheel — emerald felt table style modeled on real operator
 * promos (CrocoBet "Casino VIP Wheel", Pragmatic Play "MegaWheel"). The
 * wheel sits on a deep green baize, slices alternate emerald / near-black
 * with a thick polished gold rim. Prize labels include "FREECHIPS", cash
 * values, and multipliers styled like high-limit table signage.
 *
 * Visual language:
 *   — Baize green (#0A5334) base, gold/crimson accent
 *   — Polished brass rim with highlight bands
 *   — 12 equal slices — alternating emerald & jet with a shared gold ring
 *   — Centre hub: black disc with gold "VIP" monogram inside a laurel ring
 *   — Bottom-centred pill CTA with gold gradient
 *
 * Consumes WheelTemplateProps contract unchanged.
 */

const VB = 320
const CX = VB / 2
const RIVET_COUNT = 20

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

const DEFAULT_LABELS = [
  'FREECHIPS', '$500', '$100', 'x2', '$250', 'FREECHIPS',
  '$1000', 'x5', '$50', '$200', 'FREECHIPS', '$750',
]

export function CasinoVIPWheel({
  slices, rotation, spinning, canSpin, spinsRemaining,
  onSpin, spinButtonLabel, spinButtonColor,
  spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
  spinButtonPaddingX, spinButtonPaddingY,
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const count = Math.max(8, slices.length || 12)

  const labels = Array.from({ length: count }, (_, i) =>
    slices[i]?.label ?? DEFAULT_LABELS[i % DEFAULT_LABELS.length]!,
  )

  const GOLD = '#D4AF37'
  const GOLD_BRIGHT = '#F5E19A'
  const GOLD_DARK = '#7A5A1A'
  const EMERALD = '#0A5334'
  const EMERALD_DARK = '#063720'
  const JET = '#0B0E0B'
  const CRIMSON = '#7C1D1D'

  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-start"
      style={{ width: '100%' }}
    >
      {/* Felt table glow */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -40,
          background: 'radial-gradient(circle at 50% 45%, rgba(212,175,55,0.20) 0%, rgba(6,55,32,0.55) 50%, transparent 80%)',
          filter: 'blur(14px)',
          pointerEvents: 'none',
        }}
        animate={reduced ? undefined : { opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
        {/* Outer brass rim — two conic gradients layered for depth */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD}, ${GOLD_DARK}, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD}, ${GOLD_DARK})`,
            boxShadow: `
              0 0 0 1px ${GOLD_DARK} inset,
              0 14px 48px -12px rgba(0,0,0,0.75),
              0 0 80px -12px rgba(212,175,55,0.45)
            `,
          }}
        />
        {/* Inner rim gold ring */}
        <div
          style={{
            position: 'absolute', inset: '4.5%', borderRadius: '50%',
            background: `radial-gradient(circle at 50% 30%, ${GOLD_BRIGHT} 0%, ${GOLD} 45%, ${GOLD_DARK} 100%)`,
            boxShadow: `0 0 0 1px ${GOLD_DARK} inset`,
          }}
        />
        {/* Rivets */}
        {Array.from({ length: RIVET_COUNT }).map((_, i) => {
          const a = (i / RIVET_COUNT) * Math.PI * 2 - Math.PI / 2
          const rr = 0.5 - 0.025
          const left = `calc(50% + ${rr * 100}% * ${Math.cos(a)})`
          const top = `calc(50% + ${rr * 100}% * ${Math.sin(a)})`
          return (
            <span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                left, top,
                width: 5, height: 5,
                marginLeft: -2.5, marginTop: -2.5,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${GOLD_BRIGHT}, ${GOLD_DARK})`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
              }}
            />
          )
        })}

        {/* Wheel face */}
        <div style={{ position: 'absolute', inset: '7%' }}>
          <motion.svg
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
            animate={{ rotate: rotation }}
            transition={{ duration: reduced ? 0.3 : 5.2, ease: [0.15, 0.8, 0.2, 1] }}
          >
            <defs>
              <radialGradient id="vip-face-sheen" cx="50%" cy="32%" r="70%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
              </radialGradient>
              <radialGradient id="vip-hub" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#2A2A2A" />
                <stop offset="70%" stopColor={JET} />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              <linearGradient id="vip-monogram" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={GOLD_BRIGHT} />
                <stop offset="55%" stopColor={GOLD} />
                <stop offset="100%" stopColor={GOLD_DARK} />
              </linearGradient>
            </defs>

            <circle cx={CX} cy={CX} r={150} fill={EMERALD_DARK} />

            {/* Slices */}
            {labels.map((lbl, i) => (
              <path
                key={`s-${i}`}
                d={arcPath(i, count, 150, 46)}
                fill={i % 2 === 0 ? EMERALD : JET}
                stroke={GOLD}
                strokeWidth={0.9}
              />
            ))}

            {/* Gold inlay ring around label band */}
            <circle cx={CX} cy={CX} r={108} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.55} />

            {/* Labels */}
            {labels.map((lbl, i) => {
              const { x, y, rot } = labelXY(i, count, 122)
              const display = lbl.length > 10 ? lbl.slice(0, 9) + '…' : lbl
              const isFree = /free/i.test(lbl)
              return (
                <text
                  key={`sl-${i}`}
                  x={x} y={y}
                  fontSize={isFree ? 9 : 13}
                  fontWeight={800}
                  fill={isFree ? GOLD_BRIGHT : '#FDFBEF'}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${rot} ${x} ${y})`}
                  style={{ fontFamily: 'var(--font-display, system-ui)', letterSpacing: '0.05em' }}
                >
                  {display}
                </text>
              )
            })}

            {/* Sheen */}
            <circle cx={CX} cy={CX} r={150} fill="url(#vip-face-sheen)" pointerEvents="none" />

            {/* Central hub — black w/ gold VIP monogram + laurel ring */}
            <circle cx={CX} cy={CX} r={46} fill="url(#vip-hub)" stroke={GOLD} strokeWidth={2.5} />
            <circle cx={CX} cy={CX} r={42} fill="none" stroke={GOLD_DARK} strokeWidth={0.8} />
            <circle cx={CX} cy={CX} r={38} fill="none" stroke={CRIMSON} strokeWidth={0.8} opacity={0.5} />
            <text
              x={CX} y={CX}
              fontSize={22}
              fontWeight={900}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="url(#vip-monogram)"
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                letterSpacing: '0.12em',
              }}
            >
              VIP
            </text>
          </motion.svg>
        </div>

        {/* Top pointer — gold drop */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -2, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: `24px solid ${GOLD}`,
            filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.6))',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute', top: -10, left: '50%',
            transform: 'translateX(-50%)',
            width: 18, height: 18,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${GOLD_BRIGHT}, ${GOLD_DARK})`,
            boxShadow: `0 0 0 2px ${JET}, 0 2px 4px rgba(0,0,0,0.55)`,
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin || spinning}
        style={{
          // Template default is the polished brass pill; props override.
          marginTop: 30,
          padding: `${spinButtonPaddingY ?? 15}px ${spinButtonPaddingX ?? 52}px`,
          fontSize: spinButtonFontSize ?? fluidSize(13, 17),
          fontWeight: 900,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: spinButtonTextColor ?? JET,
          background: spinButtonColor
            ? `linear-gradient(180deg, ${spinButtonColor} 0%, ${spinButtonColor} 100%)`
            : `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`,
          border: `1px solid ${GOLD_DARK}`,
          borderRadius: spinButtonRadius ?? 999,
          cursor: canSpin && !spinning ? 'pointer' : 'not-allowed',
          opacity: canSpin && !spinning ? 1 : 0.45,
          boxShadow: `
            0 10px 26px -8px rgba(212,175,55,0.55),
            0 0 0 1px rgba(255,255,255,0.35) inset,
            0 -2px 0 rgba(0,0,0,0.28) inset
          `,
          fontFamily: 'var(--font-display, Georgia, serif)',
        }}
      >
        {spinning ? 'Spinning…' : spinButtonLabel || 'Spin to Win'}
      </button>
      {spinsRemaining != null && (
        <div
          style={{
            marginTop: 10,
            fontSize: fluidSize(10, 12),
            color: GOLD_BRIGHT,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} remaining
        </div>
      )}
    </div>
  )
}
