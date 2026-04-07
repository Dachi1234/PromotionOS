'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Gift, Star } from 'lucide-react'
import type { ProgressBarTemplateProps } from '../shared-types'

const MILESTONES = [25, 50, 75, 100]

export function TreasureFill({
  currentValue, targetValue, progressPercentage, completed, claimed,
  rewardLabel, onClaim,
  accentColor = '#D4AF37', textColor = '#FFFFFF', bgColor = '#1a1a2e',
}: ProgressBarTemplateProps) {
  const reduced = useReducedMotion()
  const pct = Math.min(100, Math.max(0, progressPercentage))

  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      x: -20 + Math.random() * 40,
      y: -30 - Math.random() * 40,
      delay: Math.random() * 0.5,
      size: 3 + Math.random() * 4,
    })), [])

  return (
    <div className="inline-flex flex-col items-center gap-3 p-6" style={{ color: textColor }}>
      <style>{`
        @keyframes tf-wave{0%{background-position:0 0}100%{background-position:200px 0}}
        @keyframes tf-glow{0%,100%{filter:drop-shadow(0 0 6px ${accentColor}60)}50%{filter:drop-shadow(0 0 18px ${accentColor})}}
        @keyframes tf-lid{0%{transform:rotate(0) translateY(0)}40%{transform:rotate(-15deg) translateY(-8px)}70%{transform:rotate(5deg) translateY(-3px)}100%{transform:rotate(-10deg) translateY(-12px)}}
        @media(prefers-reduced-motion:reduce){.tf-anim{animation:none!important}}
      `}</style>

      <div className="relative" style={{ width: 120, height: 160 }}>
        {/* Jar body — SVG outline */}
        <svg viewBox="0 0 120 160" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {/* Jar shape */}
          <path d="M25,30 Q20,30 18,40 L12,130 Q10,150 30,152 L90,152 Q110,150 108,130 L102,40 Q100,30 95,30 Z"
            fill="none" stroke={accentColor} strokeWidth={2.5}
            style={{ filter: completed ? `drop-shadow(0 0 8px ${accentColor})` : 'none' }} />
          {/* Jar neck */}
          <path d="M30,30 L30,20 Q30,12 40,12 L80,12 Q90,12 90,20 L90,30"
            fill="none" stroke={accentColor} strokeWidth={2} />
          {/* Milestone markers */}
          {MILESTONES.map(m => {
            const y = 150 - (m / 100) * 120
            return (
              <g key={m}>
                <line x1="14" y1={y} x2="22" y2={y} stroke={`${accentColor}60`} strokeWidth={1} />
                <text x="10" y={y + 3} fontSize="7" fill={`${accentColor}80`} textAnchor="end">{m}%</text>
              </g>
            )
          })}
          {/* Reward icon at top */}
          {completed && (
            <g transform="translate(60, 8)">
              <circle r="6" fill={accentColor} opacity={0.9} />
            </g>
          )}
        </svg>

        {/* Liquid fill */}
        <div className="absolute z-0 overflow-hidden"
          style={{
            left: 14, right: 14, bottom: 8, top: 30,
            clipPath: 'polygon(8% 0%, 92% 0%, 100% 95%, 96% 100%, 4% 100%, 0% 95%)',
          }}>
          <motion.div
            className="tf-anim absolute bottom-0 left-0 right-0"
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={{ duration: reduced ? 0 : 1.2, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(0deg, ${accentColor}, ${accentColor}90, ${accentColor}50)`,
              backgroundSize: '200px 100%',
              animation: !reduced && !completed ? 'tf-wave 3s linear infinite' : undefined,
              borderRadius: '2px 2px 0 0',
              boxShadow: `inset 0 4px 12px rgba(255,255,255,0.15)`,
            }}
          >
            {/* Wave effect on top edge */}
            <div className="absolute -top-1 left-0 right-0 h-3 opacity-40"
              style={{
                background: `radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.4) 0%, transparent 60%),
                             radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
              }} />
          </motion.div>
        </div>

        {/* Lid animation on complete */}
        {completed && !claimed && (
          <motion.div
            className="tf-anim absolute z-20"
            style={{
              left: 28, right: 28, top: 8, height: 14,
              background: `linear-gradient(135deg, ${accentColor}, #f5e6a3)`,
              borderRadius: '4px 4px 2px 2px',
              transformOrigin: 'left top',
              animation: !reduced ? 'tf-lid 1.5s ease-in-out forwards' : undefined,
            }}
          />
        )}

        {/* Gold glow on complete */}
        {completed && (
          <motion.div
            className="tf-anim absolute inset-0 z-5 rounded-xl pointer-events-none"
            style={{ animation: !reduced ? 'tf-glow 2s ease-in-out infinite' : undefined }}
          />
        )}

        {/* Particle burst */}
        <AnimatePresence>
          {completed && !claimed && !reduced && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {particles.map((p, i) => (
                <motion.div key={i}
                  className="absolute rounded-full"
                  style={{
                    left: '50%', top: '15%',
                    width: p.size, height: p.size,
                    background: i % 2 === 0 ? accentColor : '#f5e6a3',
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: p.x, y: p.y, opacity: [1, 1, 0] }}
                  transition={{ duration: 1, delay: p.delay + 0.8, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Center reward icon */}
        {completed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <Star size={20} color={bgColor} fill={bgColor} style={{ opacity: 0.6 }} />
          </div>
        )}
      </div>

      {/* Value display */}
      <div className="text-sm tabular-nums font-bold" style={{ color: accentColor }}>
        {currentValue.toLocaleString()} / {targetValue.toLocaleString()}
      </div>

      {/* Reward label */}
      <div className="text-xs opacity-60">{rewardLabel}</div>

      {/* Claim button */}
      {completed && !claimed && (
        <motion.button
          onClick={onClaim}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, #f5e6a3)`,
            color: bgColor,
            boxShadow: `0 0 16px ${accentColor}40`,
          }}
          whileHover={reduced ? {} : { scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Gift size={16} /> Open Treasure
        </motion.button>
      )}

      {claimed && (
        <span className="text-xs font-medium" style={{ color: '#22c55e' }}>✓ Claimed</span>
      )}
    </div>
  )
}
