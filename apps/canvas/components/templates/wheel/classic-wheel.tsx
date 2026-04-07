'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'

const VB = 300
const CX = VB / 2
const TICK_COUNT = 60

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
    x: CX + r * 0.65 * Math.cos(mid),
    y: CX + r * 0.65 * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

export function ClassicWheel({
  slices, rotation, spinning, result, canSpin, spinsRemaining,
  onSpin, wheelSize, spinButtonLabel, spinButtonColor,
  accentColor = '#D4AF37', textColor = '#FFFFFF', bgColor = '#1a1a2e',
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const isIdle = !spinning && !result
  const innerR = CX - 14
  const winIdx = result ? slices.findIndex(s => s.label === result) : -1

  const ticks = useMemo(() =>
    Array.from({ length: TICK_COUNT }, (_, i) => {
      const rad = (i / TICK_COUNT) * 2 * Math.PI
      return {
        x1: CX + (CX - 12) * Math.cos(rad), y1: CX + (CX - 12) * Math.sin(rad),
        x2: CX + (CX - 4) * Math.cos(rad), y2: CX + (CX - 4) * Math.sin(rad),
        major: i % 5 === 0,
      }
    }), [])

  const confetti = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      angle: ((i * 360) / 16) * (Math.PI / 180),
      delay: Math.random() * 0.4,
      color: ['#D4AF37', '#c0392b', '#27ae60', '#2980b9', '#8e44ad'][i % 5],
      size: 4 + Math.random() * 4,
    })), [])

  const anim = spinning || result || reduced
    ? { rotate: rotation }
    : { rotate: [rotation, rotation + 360] }

  const trans = spinning
    ? { duration: 5, ease: [0.12, 0, 0.05, 1] as [number, number, number, number] }
    : result || reduced
      ? { duration: 0 }
      : { duration: 180, repeat: Infinity, ease: 'linear' as const }

  return (
    <div
      className="relative inline-flex flex-col items-center gap-4 p-6"
      style={{ background: `radial-gradient(ellipse at center, ${bgColor}, #0a0a15)` }}
    >
      <style>{`
        @keyframes cw-glow{0%,100%{filter:drop-shadow(0 0 6px ${accentColor})}50%{filter:drop-shadow(0 0 18px ${accentColor})}}
        @keyframes cw-pulse{0%,100%{box-shadow:0 0 20px ${accentColor}40}50%{box-shadow:0 0 40px ${accentColor}90}}
        @media(prefers-reduced-motion:reduce){.cw-anim{animation:none!important}}
      `}</style>

      <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
        {/* Pointer */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 cw-anim"
          style={{
            width: 0, height: 0,
            borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
            borderTop: `24px solid ${accentColor}`,
            filter: `drop-shadow(0 0 8px ${accentColor})`,
            animation: isIdle && !reduced ? 'cw-glow 2s ease-in-out infinite' : undefined,
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
              <radialGradient id="cw-cap-g">
                <stop offset="0%" stopColor="#f5e6a3" />
                <stop offset="100%" stopColor="#8B6914" />
              </radialGradient>
              <filter id="cw-ts" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.8" floodColor="#000" floodOpacity="0.9" />
              </filter>
            </defs>
            {/* Outer gold ring */}
            <circle
              cx={CX} cy={CX} r={CX - 2} fill="none"
              stroke={accentColor} strokeWidth={5}
              style={{ filter: `drop-shadow(0 0 4px ${accentColor})` }}
            />
            {/* Embossed tick marks */}
            {ticks.map((t, i) => (
              <line
                key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={accentColor} strokeWidth={t.major ? 2 : 1} opacity={0.6}
              />
            ))}
            {/* Slices */}
            {slices.map((s, i) => (
              <path
                key={i} d={slicePath(i, slices.length, innerR)}
                fill={s.color} stroke={accentColor} strokeWidth={0.5}
                style={{
                  transformOrigin: `${CX}px ${CX}px`,
                  filter: winIdx === i
                    ? `brightness(1.4) drop-shadow(0 0 10px ${s.color})`
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
                  key={`l${i}`} x={p.x} y={p.y} fill={textColor}
                  fontSize={Math.min(13, 180 / slices.length)}
                  fontFamily="Georgia, serif" textAnchor="middle"
                  dominantBaseline="middle" filter="url(#cw-ts)"
                  transform={`rotate(${p.rot},${p.x},${p.y})`}
                >
                  {s.label}
                </text>
              )
            })}
            {/* Center cap */}
            <circle
              cx={CX} cy={CX} r={CX * 0.1} fill="url(#cw-cap-g)"
              stroke={accentColor} strokeWidth={2}
            />
          </svg>
        </motion.div>
      </div>

      {/* Confetti burst on result */}
      <AnimatePresence>
        {result && !reduced && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {confetti.map((p, i) => (
              <motion.div
                key={i} className="absolute rounded-full"
                style={{
                  left: '50%', top: '50%',
                  width: p.size, height: p.size, background: p.color,
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(p.angle) * wheelSize * 0.55,
                  y: Math.sin(p.angle) * wheelSize * 0.55,
                  scale: [0, 1.2, 0], opacity: [1, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Result text */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: wheelSize * 0.07,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: 2,
                textShadow: `0 0 20px ${accentColor}, 0 0 40px ${accentColor}60`,
              }}
            >
              {result}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button */}
      <button
        onClick={onSpin} disabled={!canSpin}
        className="cw-anim rounded-full font-bold uppercase tracking-wider transition-all"
        style={{
          width: wheelSize * 0.26, height: wheelSize * 0.26,
          background: canSpin
            ? `linear-gradient(145deg, #f5e6a3, ${spinButtonColor || accentColor}, #8B6914)`
            : '#444',
          color: canSpin ? '#1a1a2e' : '#888',
          fontFamily: 'Georgia, serif',
          fontSize: wheelSize * 0.032,
          border: `3px solid ${canSpin ? accentColor : '#555'}`,
          animation: canSpin && !reduced ? 'cw-pulse 2s ease-in-out infinite' : undefined,
          cursor: canSpin ? 'pointer' : 'not-allowed',
        }}
      >
        {canSpin ? spinButtonLabel : 'NO SPINS'}
      </button>

      {/* Spins remaining — chip badges */}
      {spinsRemaining !== null && spinsRemaining > 0 && (
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(spinsRemaining, 10) }, (_, i) => (
            <div
              key={i}
              className="rounded-full flex items-center justify-center"
              style={{
                width: 24, height: 24, fontSize: 11, fontWeight: 700,
                background: `linear-gradient(145deg, ${accentColor}, #8B6914)`,
                color: bgColor,
                border: `2px solid ${accentColor}`,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
              }}
            >
              &#9733;
            </div>
          ))}
          {spinsRemaining > 10 && (
            <span style={{ color: accentColor, fontSize: 12, alignSelf: 'center' }}>
              +{spinsRemaining - 10}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
