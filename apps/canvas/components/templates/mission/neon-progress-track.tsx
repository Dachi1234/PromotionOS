'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, Lock, Clock, Zap, X } from 'lucide-react'
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

const NODE_SIZE = 48
const RING_R = 20
const RING_CIRCUM = 2 * Math.PI * RING_R

export function NeonProgressTrack({
  steps, executionMode, onClaim,
  accentColor = '#00fff5', textColor = '#ffffff', bgColor = '#0a0a14',
}: MissionTemplateProps) {
  const { bg, text, accent } = resolveTemplateColors({ bgColor, textColor, accentColor }, 'neon')
  const reduced = useReducedMotion()
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const [surgingStep, setSurgingStep] = useState<number | null>(null)

  function statusGlow(status: string) {
    if (status === 'completed' || status === 'claimed') return accent
    if (status === 'active') return accent
    if (status === 'expired') return '#ef4444'
    return `${accent}20`
  }

  function handleClaim(order: number) {
    setSurgingStep(order)
    setTimeout(() => { onClaim(order); setSurgingStep(null) }, 700)
  }

  return (
    <div className="w-full overflow-x-auto p-6" style={{ background: bg, color: text }}>
      <style>{`
        @keyframes npt-pulse{0%,100%{opacity:0.6;filter:drop-shadow(0 0 4px ${accent}80)}50%{opacity:1;filter:drop-shadow(0 0 12px ${accent})}}
        @keyframes npt-surge{0%{stroke-dashoffset:40}100%{stroke-dashoffset:0}}
        @keyframes npt-ring{0%{stroke-dashoffset:${RING_CIRCUM}}100%{stroke-dashoffset:0}}
        @media(prefers-reduced-motion:reduce){.npt-anim{animation:none!important;transition:none!important}}
      `}</style>

      <div className="flex md:flex-row flex-col items-center gap-0 relative min-w-fit">
        {steps.map((step, i) => {
          const glow = statusGlow(step.status)
          const lit = step.status === 'completed' || step.status === 'claimed'
          const active = step.status === 'active'
          const dim = step.status === 'locked'
          const isHovered = hoveredStep === step.order
          const isSurging = surgingStep === step.order
          const strokeDash = RING_CIRCUM * (1 - step.progressPercentage / 100)

          return (
            <div key={step.order} className="flex md:flex-row flex-col items-center">
              {/* Connecting line */}
              {i > 0 && (
                <svg className="md:w-16 md:h-1 w-1 h-10 shrink-0" viewBox="0 0 64 4"
                  preserveAspectRatio="none"
                  style={{ transform: 'var(--npt-line-rot, none)' }}>
                  <line x1="0" y1="2" x2="64" y2="2"
                    stroke={lit ? accent : `${accent}15`} strokeWidth={2}
                    style={{
                      filter: lit ? `drop-shadow(0 0 4px ${accent})` : 'none',
                      ...(isSurging && !reduced ? {
                        strokeDasharray: '8 4',
                        animation: 'npt-surge 0.4s linear infinite',
                      } : {}),
                    }} />
                </svg>
              )}

              {/* Node */}
              <div className="relative"
                onMouseEnter={() => setHoveredStep(step.order)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => setHoveredStep(step.order)}
                onBlur={() => setHoveredStep(null)}
                tabIndex={0}
                role="button"
                aria-label={step.title}
              >
                <motion.div
                  className="npt-anim relative rounded-full flex items-center justify-center"
                  style={{
                    width: NODE_SIZE, height: NODE_SIZE,
                    background: bg,
                    border: `2px solid ${glow}`,
                    boxShadow: lit || active ? `0 0 12px ${glow}60, inset 0 0 8px ${glow}20` : 'none',
                    opacity: dim ? 0.35 : 1,
                    animation: active && !reduced ? 'npt-pulse 2s ease-in-out infinite' : undefined,
                  }}
                >
                  {/* Progress ring */}
                  {(active || lit) && (
                    <svg className="absolute inset-0 -rotate-90" width={NODE_SIZE} height={NODE_SIZE}>
                      <circle cx={NODE_SIZE / 2} cy={NODE_SIZE / 2} r={RING_R}
                        fill="none" stroke={`${accent}20`} strokeWidth={3} />
                      <circle cx={NODE_SIZE / 2} cy={NODE_SIZE / 2} r={RING_R}
                        fill="none" stroke={accent} strokeWidth={3}
                        strokeDasharray={RING_CIRCUM}
                        strokeDashoffset={lit ? 0 : strokeDash}
                        strokeLinecap="round"
                        style={{ transition: reduced ? 'none' : 'stroke-dashoffset 0.6s ease-out' }} />
                    </svg>
                  )}

                  {/* Icon */}
                  {lit ? <Check size={18} color={accent} strokeWidth={3} />
                    : step.status === 'locked' ? <Lock size={14} color={`${accent}40`} />
                      : step.status === 'expired' ? <X size={16} color="#ef4444" />
                        : <Zap size={16} color={accent} />}
                </motion.div>

                {/* Step number */}
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono"
                  style={{ color: `${accent}60` }}>
                  {String(step.order).padStart(2, '0')}
                </span>

                {/* Hover/tap detail card */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: reduced ? 0 : 0.15 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20 rounded-lg p-3 whitespace-nowrap"
                      style={{
                        background: `${bg}f5`, minWidth: 160,
                        border: `1px solid ${accent}40`,
                        boxShadow: `0 0 20px ${accent}15`,
                      }}
                    >
                      <div className="text-xs font-bold mb-1" style={{ color: accent }}>{step.title}</div>
                      <p className="text-[10px] opacity-60 mb-2">{step.description}</p>
                      <div className="flex justify-between text-[10px] tabular-nums opacity-70">
                        <span>{step.currentValue}/{step.targetValue}</span>
                        {step.expiresAt && (
                          <span className="flex items-center gap-0.5"><Clock size={9} /> {timeLeft(step.expiresAt)}</span>
                        )}
                      </div>

                      {step.status === 'completed' && (
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); handleClaim(step.order) }}
                          className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded text-[10px] font-bold"
                          style={{ background: accent, color: bg }}
                          whileHover={reduced ? {} : { scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Zap size={10} /> Claim Reward
                        </motion.button>
                      )}

                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                        style={{ background: `${bg}f5`, borderRight: `1px solid ${accent}40`, borderBottom: `1px solid ${accent}40` }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-[9px] uppercase tracking-[0.3em] mt-8" style={{ color: `${accent}40` }}>
        {executionMode} execution ⚡ {steps.filter(s => s.status === 'completed' || s.status === 'claimed').length}/{steps.length} complete
      </div>
    </div>
  )
}
