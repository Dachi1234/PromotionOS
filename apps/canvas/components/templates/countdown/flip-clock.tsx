'use client'

import { useState, useEffect, useRef } from 'react'
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

function FlipDigit({ value, prev, label, accent, text, reduced }:
  { value: string; prev: string; label: string; accent: string; text: string; reduced: boolean | null }) {
  const changed = value !== prev

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 44, height: 56, perspective: 200 }}>
        {/* Static bottom (new value) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-lg overflow-hidden flex items-start justify-center"
          style={{ background: '#1e1e1e', borderTop: '1px solid #333' }}>
          <span className="text-2xl font-bold tabular-nums mt-[-14px]" style={{ color: text }}>{value}</span>
        </div>

        {/* Static top (new value) */}
        <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-lg overflow-hidden flex items-end justify-center"
          style={{ background: '#252525' }}>
          <span className="text-2xl font-bold tabular-nums mb-[-14px]" style={{ color: text }}>{value}</span>
        </div>

        {/* Flipping top half (old value) */}
        {changed && !reduced && (
          <div className="fc-flip absolute inset-x-0 top-0 h-1/2 rounded-t-lg overflow-hidden flex items-end justify-center z-10"
            style={{ background: '#252525', transformOrigin: 'bottom', backfaceVisibility: 'hidden' }}>
            <span className="text-2xl font-bold tabular-nums mb-[-14px]" style={{ color: text }}>{prev}</span>
          </div>
        )}
      </div>
      <span className="text-[9px] uppercase tracking-wider opacity-40" style={{ color: text }}>{label}</span>
    </div>
  )
}

function Colon({ color }: { color: string }) {
  return (
    <div className="flex flex-col gap-2 pt-2" style={{ color }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
    </div>
  )
}

export function FlipClock({
  targetDate, label,
  accentColor = '#d4a017', textColor = '#f5f5f4', bgColor = '#0c0a09',
}: CountdownTemplateProps) {
  const reduced = useReducedMotion()
  const [time, setTime] = useState(() => calcRemaining(targetDate))
  const prevRef = useRef(time)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(prev => {
        prevRef.current = prev
        return calcRemaining(targetDate)
      })
    }, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const prev = prevRef.current
  const units: { value: string; prev: string; label: string }[] = [
    { value: pad(time.d), prev: pad(prev.d), label: 'Days' },
    { value: pad(time.h), prev: pad(prev.h), label: 'Hours' },
    { value: pad(time.m), prev: pad(prev.m), label: 'Min' },
    { value: pad(time.s), prev: pad(prev.s), label: 'Sec' },
  ]

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-2xl text-center" style={{ background: bgColor }}>
      <style>{`
        @keyframes fc-down{0%{transform:rotateX(0)}100%{transform:rotateX(-90deg)}}
        .fc-flip{animation:fc-down .3s ease-in forwards}
        @media(prefers-reduced-motion:reduce){.fc-flip{animation:none!important}}
      `}</style>

      {label && (
        <div className="text-xs font-semibold mb-3 uppercase tracking-widest"
          style={{ color: accentColor, opacity: 0.7 }}>{label}</div>
      )}

      <div className="flex items-start justify-center gap-1.5">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-1.5">
            {u.value.split('').map((digit, di) => (
              <FlipDigit
                key={`${u.label}-${di}`}
                value={digit}
                prev={u.prev[di]}
                label={di === u.value.length - 1 ? u.label : ''}
                accent={accentColor}
                text={textColor}
                reduced={reduced}
              />
            ))}
            {i < units.length - 1 && <Colon color={accentColor} />}
          </div>
        ))}
      </div>
    </div>
  )
}
