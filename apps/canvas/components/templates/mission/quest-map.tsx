'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, Lock, Clock, MapPin, X } from 'lucide-react'
import type { MissionTemplateProps } from '../shared-types'

function timeLeft(expiresAt?: string) {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const WAYPOINT_GAP = 140
const NODE_R = 22

export function QuestMap({
  steps, executionMode, onClaim,
  accentColor = '#D4AF37', textColor = '#FFFFFF', bgColor = '#1a1a2e',
}: MissionTemplateProps) {
  const reduced = useReducedMotion()
  const [claimingStep, setClaimingStep] = useState<number | null>(null)

  const totalW = useMemo(() => Math.max(400, steps.length * WAYPOINT_GAP + 80), [steps.length])
  const pathHeight = 160

  const waypoints = useMemo(() =>
    steps.map((s, i) => ({
      ...s,
      cx: 60 + i * WAYPOINT_GAP,
      cy: pathHeight / 2 + (i % 2 === 0 ? -20 : 20),
    })), [steps, pathHeight])

  const trailD = useMemo(() => {
    if (waypoints.length < 2) return ''
    let d = `M${waypoints[0].cx},${waypoints[0].cy}`
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1]
      const cur = waypoints[i]
      const cpx = (prev.cx + cur.cx) / 2
      d += ` Q${cpx},${prev.cy} ${cpx},${(prev.cy + cur.cy) / 2}`
      d += ` Q${cpx},${cur.cy} ${cur.cx},${cur.cy}`
    }
    return d
  }, [waypoints])

  const statusColor = (s: string) => {
    if (s === 'completed' || s === 'claimed') return '#22c55e'
    if (s === 'active') return accentColor
    if (s === 'expired') return '#ef4444'
    return '#6b7280'
  }

  function handleClaim(order: number) {
    setClaimingStep(order)
    setTimeout(() => { onClaim(order); setClaimingStep(null) }, 600)
  }

  return (
    <div className="w-full overflow-x-auto" style={{ background: bgColor, color: textColor }}>
      <style>{`
        @keyframes qm-pulse{0%,100%{filter:drop-shadow(0 0 4px ${accentColor}80)}50%{filter:drop-shadow(0 0 12px ${accentColor})}}
        @keyframes qm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes qm-chest{0%{transform:scale(1)}30%{transform:scale(1.2) rotate(-5deg)}60%{transform:scale(1.15) rotate(3deg)}100%{transform:scale(1)}}
        @media(prefers-reduced-motion:reduce){.qm-anim{animation:none!important}}
      `}</style>

      <div className="relative" style={{ width: totalW, minHeight: pathHeight + 120, padding: '20px 0' }}>
        <svg width={totalW} height={pathHeight} className="absolute top-5 left-0">
          <path d={trailD} fill="none" stroke={`${accentColor}30`} strokeWidth={3} strokeDasharray="8 6" />
          {waypoints.map((wp, i) => {
            if (i === 0) return null
            const prev = waypoints[i - 1]
            const lit = prev.status === 'completed' || prev.status === 'claimed'
            return lit ? (
              <line key={i} x1={prev.cx} y1={prev.cy} x2={wp.cx} y2={wp.cy}
                stroke={accentColor} strokeWidth={2} opacity={0.6} />
            ) : null
          })}
        </svg>

        {waypoints.map((wp) => {
          const isClaiming = claimingStep === wp.order
          return (
            <div key={wp.order} className="absolute" style={{
              left: wp.cx - NODE_R, top: 20 + wp.cy - NODE_R, width: NODE_R * 2,
            }}>
              {/* Node */}
              <div className="flex flex-col items-center">
                <motion.div
                  className="qm-anim relative rounded-full flex items-center justify-center"
                  style={{
                    width: NODE_R * 2, height: NODE_R * 2,
                    background: wp.status === 'completed' || wp.status === 'claimed'
                      ? `linear-gradient(135deg, ${accentColor}, #f5e6a3)` : wp.status === 'active'
                        ? bgColor : wp.status === 'expired' ? '#451a1a' : `${bgColor}`,
                    border: `3px solid ${statusColor(wp.status)}`,
                    animation: wp.status === 'active' && !reduced ? 'qm-pulse 2s ease-in-out infinite' : undefined,
                    boxShadow: wp.status === 'active' ? `0 0 16px ${accentColor}60` : 'none',
                  }}
                >
                  {wp.status === 'completed' || wp.status === 'claimed' ? (
                    <Check size={18} color={bgColor} strokeWidth={3} />
                  ) : wp.status === 'locked' ? (
                    <Lock size={14} color="#6b7280" />
                  ) : wp.status === 'expired' ? (
                    <X size={16} color="#ef4444" strokeWidth={3} />
                  ) : (
                    <MapPin size={16} color={accentColor} />
                  )}
                </motion.div>

                {/* Active avatar indicator */}
                {wp.status === 'active' && (
                  <motion.div className="qm-anim absolute -top-3"
                    style={{ animation: !reduced ? 'qm-float 2s ease-in-out infinite' : undefined }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{ background: accentColor, color: bgColor, fontSize: 10, fontWeight: 700 }}>
                      ▼
                    </div>
                  </motion.div>
                )}

                {/* Step label */}
                <span className="text-[10px] mt-1 font-medium text-center whitespace-nowrap opacity-80"
                  style={{ color: textColor, maxWidth: 100 }}>
                  {wp.title}
                </span>

                {/* Active step detail card */}
                <AnimatePresence>
                  {wp.status === 'active' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-full mt-2 rounded-lg p-2.5 z-10 whitespace-nowrap"
                      style={{
                        background: `${bgColor}f0`, border: `1px solid ${accentColor}40`,
                        boxShadow: `0 4px 20px rgba(0,0,0,0.4)`, minWidth: 120,
                      }}
                    >
                      <div className="text-[11px] font-semibold mb-1" style={{ color: accentColor }}>{wp.description}</div>
                      <div className="w-full h-1.5 rounded-full mb-1" style={{ background: `${accentColor}20` }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${wp.progressPercentage}%`, background: accentColor }} />
                      </div>
                      <div className="flex justify-between text-[10px] opacity-70">
                        <span>{wp.currentValue}/{wp.targetValue}</span>
                        {wp.expiresAt && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={9} /> {timeLeft(wp.expiresAt)}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Claim button (treasure chest) */}
                {wp.status === 'completed' && (
                  <motion.button
                    onClick={() => handleClaim(wp.order)}
                    className="qm-anim mt-1 px-2 py-1 rounded text-[10px] font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, #f5e6a3)`,
                      color: bgColor,
                      animation: isClaiming && !reduced ? 'qm-chest 0.6s ease-in-out' : undefined,
                    }}
                    whileHover={reduced ? {} : { scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🎁 Claim
                  </motion.button>
                )}
              </div>
            </div>
          )
        })}

        {/* Execution mode badge */}
        <div className="absolute top-1 right-3 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ color: `${accentColor}80`, border: `1px solid ${accentColor}20` }}>
          {executionMode}
        </div>
      </div>
    </div>
  )
}
