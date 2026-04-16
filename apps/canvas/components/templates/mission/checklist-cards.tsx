'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, Lock, Clock, Gift, ChevronDown } from 'lucide-react'
import { resolveTemplateColors } from '@/lib/theme-utils'
import type { MissionTemplateProps } from '../shared-types'

function timeLeft(expiresAt?: string) {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const BORDER_COLORS: Record<string, string> = {
  locked: '#6b7280',
  expired: '#ef4444',
  claimed: '#4ade80',
}

export function ChecklistCards({
  steps, executionMode, onClaim,
  accentColor = '#6366f1', textColor = '#1f2937', bgColor = '#ffffff',
}: MissionTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'modern')
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const set = new Set<number>()
    steps.forEach(s => { if (s.status !== 'locked') set.add(s.order) })
    return set
  })

  function borderColor(status: string) {
    return BORDER_COLORS[status] ?? (status === 'completed' ? '#22c55e' : accent)
  }

  function toggleExpand(order: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(order) ? next.delete(order) : next.add(order)
      return next
    })
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-2 p-4" style={{ background: bg, color: text }}>
      <style>{`
        @keyframes cl-shine{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(prefers-reduced-motion:reduce){.cl-anim{animation:none!important}}
      `}</style>

      {steps.map((step) => {
        const isLocked = step.status === 'locked'
        const isCollapsed = isLocked && executionMode === 'sequential' && !expanded.has(step.order)
        const border = borderColor(step.status)
        const remaining = timeLeft(step.expiresAt)

        return (
          <motion.div
            key={step.order}
            layout={!reduced}
            className="rounded-xl overflow-hidden transition-shadow"
            style={{
              borderLeft: `4px solid ${border}`,
              background: bg,
              boxShadow: step.status === 'active'
                ? `0 2px 12px ${accent}20` : '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {/* Header */}
            <button
              onClick={() => toggleExpand(step.order)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ color: text }}
            >
              {/* Step number circle */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: step.status === 'completed' || step.status === 'claimed'
                    ? '#22c55e' : step.status === 'active' ? accent
                      : step.status === 'expired' ? '#ef4444' : '#e5e7eb',
                  color: isLocked ? '#9ca3af' : '#fff',
                }}>
                {step.status === 'completed' || step.status === 'claimed'
                  ? <Check size={14} strokeWidth={3} />
                  : isLocked ? <Lock size={12} /> : step.order}
              </div>

              <span className="flex-1 text-sm font-semibold truncate"
                style={{ opacity: isLocked ? 0.5 : 1 }}>
                {step.title}
              </span>

              {/* Countdown badge */}
              {remaining && step.status === 'active' && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}15`, color: accent }}>
                  <Clock size={10} /> {remaining}
                </span>
              )}

              <ChevronDown size={16} className="shrink-0 transition-transform"
                style={{
                  opacity: 0.4,
                  transform: expanded.has(step.order) ? 'rotate(180deg)' : 'rotate(0)',
                }} />
            </button>

            {/* Expandable body */}
            <AnimatePresence initial={false}>
              {!isCollapsed && expanded.has(step.order) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3">
                    <p className="text-xs opacity-60 mb-2">{step.description}</p>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full mb-1"
                      style={{ background: `${accent}15` }}>
                      <motion.div
                        className="cl-anim h-full rounded-full"
                        style={{
                          background: step.status === 'completed' || step.status === 'claimed'
                            ? '#22c55e'
                            : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                          backgroundSize: step.status === 'active' ? '200% 100%' : undefined,
                          animation: step.status === 'active' && !reduced
                            ? 'cl-shine 2s linear infinite' : undefined,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progressPercentage}%` }}
                        transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] tabular-nums opacity-50">
                        {step.currentValue} / {step.targetValue}
                      </span>

                      {/* Claim button */}
                      {step.status === 'completed' && (
                        <motion.button
                          onClick={() => onClaim(step.order)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: accent, color: '#fff' }}
                          whileHover={reduced ? {} : { scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Gift size={12} /> Claim
                        </motion.button>
                      )}

                      {step.status === 'claimed' && (
                        <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#22c55e' }}>
                          <Check size={12} /> Claimed
                        </span>
                      )}

                      {step.status === 'expired' && (
                        <span className="text-[11px] font-medium text-red-500">Expired</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {/* Mode indicator */}
      <div className="text-center text-[10px] uppercase tracking-widest pt-1" style={{ opacity: 0.3 }}>
        {executionMode} mode
      </div>
    </div>
  )
}
