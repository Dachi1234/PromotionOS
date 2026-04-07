'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'

const VB = 300
const CX = VB / 2
const OPACITIES = [1, 0.8, 0.6, 0.4, 0.9, 0.7, 0.5, 0.35]

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

export function ModernWheel({
  slices, rotation, spinning, result, canSpin, spinsRemaining,
  onSpin, wheelSize, spinButtonLabel, spinButtonColor,
  accentColor = '#6366f1', textColor = '#1e1b4b', bgColor = '#ffffff',
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const innerR = CX - 4
  const winIdx = result ? slices.findIndex(s => s.label === result) : -1

  const rings = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({ delay: i * 0.12 })), [])

  return (
    <div
      className="relative inline-flex flex-col items-center gap-5 p-6"
      style={{ background: bgColor }}
    >
      <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
        {/* Pointer */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
          style={{
            width: 0, height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `18px solid ${accentColor}`,
          }}
        />

        {/* Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: 4.5, ease: [0, 0, 0.2, 1] }
              : { duration: 0 }
          }
          style={{
            width: '100%', height: '100%', willChange: 'transform',
            filter: !result ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' : undefined,
          }}
        >
          <svg viewBox={`0 0 ${VB} ${VB}`} className="block w-full h-full">
            {/* Slices — monochromatic from accentColor */}
            {slices.map((s, i) => (
              <path
                key={i} d={slicePath(i, slices.length, innerR)}
                fill={accentColor}
                fillOpacity={OPACITIES[i % OPACITIES.length]}
                stroke={bgColor} strokeWidth={3}
                style={{
                  transformOrigin: `${CX}px ${CX}px`,
                  transform: winIdx === i ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 0.5s ease',
                }}
              />
            ))}
            {/* Labels */}
            {slices.map((s, i) => {
              const p = labelXY(i, slices.length, innerR)
              const bright = OPACITIES[i % OPACITIES.length] >= 0.7
              return (
                <text
                  key={`l${i}`} x={p.x} y={p.y}
                  fill={bright ? '#fff' : textColor}
                  fontSize={Math.min(12, 180 / slices.length)}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight={500} textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${p.rot},${p.x},${p.y})`}
                >
                  {s.label}
                </text>
              )
            })}
            {/* Center dot */}
            <circle
              cx={CX} cy={CX} r={CX * 0.07} fill={bgColor}
              stroke={accentColor} strokeWidth={1.5} strokeOpacity={0.3}
            />
          </svg>
        </motion.div>
      </div>

      {/* Expanding circles on result */}
      <AnimatePresence>
        {result && !reduced && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            {rings.map((c, i) => (
              <motion.div
                key={i} className="absolute rounded-full"
                style={{ border: `2px solid ${accentColor}` }}
                initial={{ width: 0, height: 0, opacity: 0.6 }}
                animate={{
                  width: wheelSize * 1.1,
                  height: wheelSize * 1.1,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, delay: c.delay, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Result — frosted glass card */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div
              className="rounded-2xl px-8 py-5 text-center"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${accentColor}20`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              <p
                style={{
                  color: accentColor,
                  fontSize: wheelSize * 0.065,
                  fontWeight: 700,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  margin: 0,
                }}
              >
                {result}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button — pill shape */}
      <button
        onClick={onSpin} disabled={!canSpin}
        className="font-semibold transition-all duration-200"
        style={{
          padding: `${wheelSize * 0.03}px ${wheelSize * 0.08}px`,
          borderRadius: 999,
          fontSize: wheelSize * 0.035,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: canSpin ? (spinButtonColor || accentColor) : 'transparent',
          color: canSpin ? '#fff' : accentColor + '60',
          border: canSpin ? 'none' : `2px solid ${accentColor}30`,
          cursor: canSpin ? 'pointer' : 'not-allowed',
          boxShadow: canSpin ? `0 4px 14px ${accentColor}30` : 'none',
        }}
      >
        {canSpin ? spinButtonLabel : 'No Spins'}
      </button>

      {/* Spins remaining — plain text */}
      {spinsRemaining !== null && (
        <p
          style={{
            color: textColor + '80',
            fontSize: 13,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: 0,
          }}
        >
          {spinsRemaining} spin{spinsRemaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  )
}
