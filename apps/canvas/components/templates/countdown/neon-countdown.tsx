'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { CountdownTemplateProps } from '../shared-types'

function calcRemaining(target: string) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now())
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  }
}

function pad(n: number) { return n.toString().padStart(2, '0') }

/* Seven-segment paths for digits 0-9 */
const SEGMENTS: Record<string, boolean[]> = {
  '0': [true,true,true,false,true,true,true],
  '1': [false,false,true,false,false,true,false],
  '2': [true,false,true,true,true,false,true],
  '3': [true,false,true,true,false,true,true],
  '4': [false,true,true,true,false,true,false],
  '5': [true,true,false,true,false,true,true],
  '6': [true,true,false,true,true,true,true],
  '7': [true,false,true,false,false,true,false],
  '8': [true,true,true,true,true,true,true],
  '9': [true,true,true,true,false,true,true],
}

const SEG_PATHS = [
  'M4,2 L26,2 L23,5 L7,5 Z',        // top
  'M2,4 L5,7 L5,16 L2,19 Z',         // top-left
  'M28,4 L28,19 L25,16 L25,7 Z',     // top-right
  'M4,20 L7,17 L23,17 L26,20 L23,23 L7,23 Z', // middle
  'M2,21 L5,24 L5,33 L2,36 Z',       // bottom-left
  'M28,21 L28,36 L25,33 L25,24 Z',   // bottom-right
  'M4,38 L7,35 L23,35 L26,38 Z',     // bottom
]

function SegDigit({ char, color, prevChar, reduced }:
  { char: string; color: string; prevChar: string; reduced: boolean | null }) {
  const segs = SEGMENTS[char] ?? SEGMENTS['0']
  const changed = char !== prevChar

  return (
    <svg width={30} height={40} viewBox="0 0 30 40" className="nc-seg">
      {segs.map((on, i) => (
        <path key={i} d={SEG_PATHS[i]}
          fill={on ? color : `${color}10`}
          style={{
            filter: on ? `drop-shadow(0 0 4px ${color})` : 'none',
            transition: reduced ? 'none' : 'fill 0.15s, filter 0.15s',
            opacity: on && changed && !reduced ? undefined : undefined,
          }}
        />
      ))}
      {changed && !reduced && (
        <rect x={0} y={0} width={30} height={40} fill={color} opacity={0}
          className="nc-anim"
          style={{ animation: 'nc-flash 0.2s ease-out' }}
        />
      )}
    </svg>
  )
}

function ColonDots({ color }: { color: string }) {
  return (
    <svg width={8} height={40} viewBox="0 0 8 40">
      <circle cx={4} cy={14} r={2} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={4} cy={26} r={2} fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  )
}

export function NeonCountdown({
  targetDate, label,
  accentColor = '#06b6d4', textColor = '#e0f2fe', bgColor = '#0a0a0a',
}: CountdownTemplateProps) {
  const reduced = useReducedMotion()
  const [time, setTime] = useState(() => calcRemaining(targetDate))
  const prevRef = useRef(time)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(prev => { prevRef.current = prev; return calcRemaining(targetDate) })
    }, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const prev = prevRef.current
  const groups = useMemo(() => [
    { digits: pad(time.d), prevDigits: pad(prev.d), label: 'DAYS' },
    { digits: pad(time.h), prevDigits: pad(prev.h), label: 'HRS' },
    { digits: pad(time.m), prevDigits: pad(prev.m), label: 'MIN' },
    { digits: pad(time.s), prevDigits: pad(prev.s), label: 'SEC' },
  ], [time, prev])

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-2xl text-center" style={{ background: bgColor }}>
      <style>{`
        @keyframes nc-flash{0%{opacity:.4}100%{opacity:0}}
        @media(prefers-reduced-motion:reduce){.nc-anim{animation:none!important}}
      `}</style>

      {label && (
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4"
          style={{
            color: accentColor,
            textShadow: `0 0 8px ${accentColor}`,
          }}>{label}</div>
      )}

      <div className="flex items-start justify-center gap-2">
        {groups.map((g, gi) => (
          <div key={g.label} className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex gap-0.5">
                {g.digits.split('').map((ch, ci) => (
                  <SegDigit key={ci} char={ch} prevChar={g.prevDigits[ci]}
                    color={accentColor} reduced={reduced} />
                ))}
              </div>
              <span className="text-[8px] tracking-widest" style={{ color: accentColor, opacity: 0.5 }}>
                {g.label}
              </span>
            </div>
            {gi < groups.length - 1 && <ColonDots color={accentColor} />}
          </div>
        ))}
      </div>
    </div>
  )
}
