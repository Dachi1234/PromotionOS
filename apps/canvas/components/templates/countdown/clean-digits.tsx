'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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

function Unit({ value, label, textColor, reduced }:
  { value: string; label: string; textColor: string; reduced: boolean | null }) {
  const prevRef = useRef(value)
  const changed = prevRef.current !== value
  prevRef.current = value

  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden" style={{ height: 48, width: 52 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold tabular-nums"
            style={{ color: textColor }}
            initial={changed && !reduced ? { y: 20, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] uppercase tracking-widest mt-0.5"
        style={{ color: textColor, opacity: 0.4 }}>{label}</span>
    </div>
  )
}

export function CleanDigits({
  targetDate, label,
  accentColor = '#6366f1', textColor = '#1f2937', bgColor = '#ffffff',
}: CountdownTemplateProps) {
  const reduced = useReducedMotion()
  const [time, setTime] = useState(() => calcRemaining(targetDate))

  useEffect(() => {
    const id = setInterval(() => setTime(calcRemaining(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const units = [
    { value: pad(time.d), label: 'Days' },
    { value: pad(time.h), label: 'Hours' },
    { value: pad(time.m), label: 'Min' },
    { value: pad(time.s), label: 'Sec' },
  ]

  return (
    <div className="w-full max-w-sm mx-auto p-5 rounded-2xl text-center" style={{ background: bgColor }}>
      {label && (
        <div className="text-xs font-medium mb-3" style={{ color: accentColor }}>{label}</div>
      )}

      <div className="flex items-start justify-center gap-2">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-2">
            <Unit value={u.value} label={u.label} textColor={textColor} reduced={reduced} />
            {i < units.length - 1 && (
              <span className="text-2xl font-bold pt-2" style={{ color: textColor, opacity: 0.2 }}>:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
