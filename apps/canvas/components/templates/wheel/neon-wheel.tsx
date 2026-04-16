'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { WheelTemplateProps } from '../shared-types'

const VB = 300
const CX = VB / 2
const NEON = ['#00fff5', '#ff00ff', '#39ff14', '#ff6600', '#bf00ff', '#ff1493', '#00e5ff', '#ffea00']

function slicePath(i: number, n: number, r: number) {
  const a = (2 * Math.PI) / n
  const s = i * a - Math.PI / 2
  const e = s + a - 0.001
  return `M${CX},${CX}L${CX + r * Math.cos(s)},${CX + r * Math.sin(s)}A${r},${r},0,${
    a > Math.PI ? 1 : 0
  },1,${CX + r * Math.cos(e)},${CX + r * Math.sin(e)}Z`
}

function labelPos(i: number, n: number, r: number) {
  const a = (2 * Math.PI) / n
  const mid = i * a + a / 2 - Math.PI / 2
  return {
    x: CX + r * 0.62 * Math.cos(mid),
    y: CX + r * 0.62 * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

export function NeonWheel({
  slices, rotation, spinning, result, canSpin, spinsRemaining,
  onSpin, wheelSize, spinButtonLabel, spinButtonColor,
  accentColor = '#00fff5', textColor = '#ffffff', bgColor = '#0a0a0f',
}: WheelTemplateProps) {
  const { bg, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'neon')
  const reduced = useReducedMotion()
  const innerR = CX - 16
  const winIdx = result ? slices.findIndex(s => s.label === result) : -1
  const isIdle = !spinning && !result
  const neonC = slices.map((_, i) => NEON[i % NEON.length])

  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!result) { setTyped(''); return }
    if (reduced) { setTyped(result); return }
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(result.slice(0, i))
      if (i >= result.length) clearInterval(iv)
    }, 80)
    return () => clearInterval(iv)
  }, [result, reduced])

  const segDigits = useMemo(() => {
    if (spinsRemaining === null) return null
    return String(spinsRemaining).padStart(2, '0').split('')
  }, [spinsRemaining])

  const bolts = useMemo(() => [
    'M-8,-28 L4,-10 L-2,-7 L10,18 L0,4 L6,7 Z',
    'M8,-24 L-3,-7 L4,-4 L-7,20 L1,5 L-4,9 Z',
  ], [])

  return (
    <div
      className="relative inline-flex flex-col items-center gap-5 p-6"
      style={{ background: bg }}
    >
      <style>{`
        @keyframes nw-breathe{0%,100%{filter:drop-shadow(0 0 8px ${accent})}50%{filter:drop-shadow(0 0 28px ${accent})}}
        @keyframes nw-chase{0%,100%{opacity:0.35}50%{opacity:1}}
        @keyframes nw-flash{0%,28%,56%,100%{opacity:1}14%,42%,70%{opacity:0.15}}
        @keyframes nw-cursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes nw-ring{0%,100%{box-shadow:0 0 12px ${accent},0 0 24px ${accent}50,inset 0 0 12px ${accent}25}50%{box-shadow:0 0 22px ${accent},0 0 44px ${accent}70,inset 0 0 22px ${accent}40}}
        @media(prefers-reduced-motion:reduce){.nw-anim{animation:none!important}}
      `}</style>

      <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
        {/* Pointer */}
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 nw-anim"
          style={{
            width: 0, height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: `24px solid ${accent}`,
            filter: spinning
              ? `drop-shadow(0 0 20px ${accent}) drop-shadow(0 0 40px ${accent})`
              : `drop-shadow(0 0 12px ${accent}) drop-shadow(0 0 24px ${accent})`,
            animation: isIdle && !reduced ? 'nw-breathe 2s ease-in-out infinite' : undefined,
          }}
        />

        {/* Outer neon ring */}
        <div
          className="absolute inset-0 rounded-full nw-anim"
          style={{
            border: `4px solid ${accent}`,
            boxShadow: `0 0 15px ${accent}, 0 0 30px ${accent}50, inset 0 0 15px ${accent}25`,
            animation: isIdle && !reduced ? 'nw-ring 3s ease-in-out infinite' : undefined,
          }}
        />

        {/* Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: 5.5, ease: [0.15, 0, 0.05, 1] }
              : { duration: 0 }
          }
          style={{ width: '100%', height: '100%', willChange: 'transform' }}
        >
          <svg viewBox={`0 0 ${VB} ${VB}`} className="block w-full h-full">
            <defs>
              <filter id="nw-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {slices.map((_, i) => (
              <path
                key={i}
                d={slicePath(i, slices.length, innerR)}
                fill={bg}
                fillOpacity={0.9}
                stroke={neonC[i]}
                strokeWidth={2.5}
                className={isIdle && !reduced ? 'nw-anim' : ''}
                style={{
                  transformOrigin: `${CX}px ${CX}px`,
                  filter: winIdx === i
                    ? `drop-shadow(0 0 10px ${neonC[i]}) drop-shadow(0 0 20px ${neonC[i]})`
                    : `drop-shadow(0 0 3px ${neonC[i]}60)`,
                  animation: winIdx === i
                    ? 'nw-flash 1s ease-in-out forwards'
                    : isIdle && !reduced
                      ? `nw-chase 2s ${(i / slices.length) * 2}s ease-in-out infinite`
                      : undefined,
                  transition: 'filter 0.4s',
                }}
              />
            ))}

            {slices.map((s, i) => {
              const p = labelPos(i, slices.length, innerR)
              return (
                <text
                  key={`l${i}`}
                  x={p.x}
                  y={p.y}
                  fill={neonC[i]}
                  fontSize={Math.min(11, 160 / slices.length)}
                  fontFamily="'Courier New', monospace"
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  filter="url(#nw-glow)"
                  transform={`rotate(${p.rot},${p.x},${p.y})`}
                >
                  {s.label}
                </text>
              )
            })}

            <circle
              cx={CX} cy={CX} r={CX * 0.08}
              fill={bg} stroke={accent} strokeWidth={2}
              style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Lightning bolts on result */}
      <AnimatePresence>
        {result && !reduced && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            {bolts.map((d, i) => (
              <motion.svg
                key={i}
                className="absolute"
                width={wheelSize * 0.25}
                height={wheelSize * 0.25}
                viewBox="-15 -35 30 60"
                style={{ left: `${30 + i * 40}%`, top: '25%' }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 1, 0.7, 1], scale: [0.3, 1.3, 1, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.25 }}
              >
                <path
                  d={d}
                  fill={accent}
                  fillOpacity={0.15}
                  stroke={accent}
                  strokeWidth={1.5}
                  strokeLinejoin="bevel"
                  style={{
                    filter: `drop-shadow(0 0 6px ${accent}) drop-shadow(0 0 14px ${accent})`,
                  }}
                />
              </motion.svg>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Result — typewriter neon text */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: wheelSize * 0.065,
                fontWeight: 700,
                color: accent,
                letterSpacing: 3,
                textShadow: `0 0 10px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}60`,
              }}
            >
              {typed}
              <span
                className="nw-anim"
                style={{ animation: 'nw-cursor 0.8s step-end infinite' }}
              >
                _
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button — sharp rectangle, neon border */}
      <button
        onClick={onSpin}
        disabled={!canSpin}
        className="font-bold uppercase tracking-widest transition-all"
        style={{
          padding: `${wheelSize * 0.028}px ${wheelSize * 0.07}px`,
          fontSize: wheelSize * 0.03,
          fontFamily: "'Courier New', monospace",
          background: 'transparent',
          color: canSpin ? accent : `${accent}40`,
          border: `2px solid ${canSpin ? (spinButtonColor || accent) : `${accent}25`}`,
          boxShadow: canSpin
            ? `0 0 10px ${spinButtonColor || accent}60, inset 0 0 10px ${spinButtonColor || accent}15`
            : 'none',
          cursor: canSpin ? 'pointer' : 'not-allowed',
        }}
      >
        {canSpin ? spinButtonLabel : 'NO SPINS'}
      </button>

      {/* Spins remaining — seven-segment LED style */}
      {segDigits && (
        <div className="flex gap-1.5 items-center">
          <span
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10,
              color: `${accent}60`,
              letterSpacing: 1,
            }}
          >
            SPINS
          </span>
          <div className="flex gap-0.5">
            {segDigits.map((d, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: accent,
                  lineHeight: 1,
                  minWidth: 18,
                  textAlign: 'center',
                  textShadow: `0 0 8px ${accent}, 0 0 16px ${accent}60`,
                  background: `${accent}08`,
                  border: `1px solid ${accent}20`,
                  padding: '2px 4px',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
