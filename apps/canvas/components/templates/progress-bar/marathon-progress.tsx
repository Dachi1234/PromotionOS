'use client'

import type { ProgressBarTemplateProps } from '@/components/templates/shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * MarathonProgress — Crocobet "Marathon" banner variant.
 *
 * A full-width panel with a large centered progress ring (runner motif)
 * flanked by the current / target tally on one side and the prize label on
 * the other. Designed as the hero progress block on a marathon campaign
 * page. Gold + crimson accent, navy field.
 */

export function MarathonProgress({
  currentValue, targetValue, progressPercentage, completed, claimed,
  rewardLabel, onClaim, accentColor, textColor, bgColor,
}: ProgressBarTemplateProps) {
  const GOLD = accentColor || '#D4AF37'
  const fg = textColor || '#F4ECD8'
  const bg = bgColor || '#0A0E1A'

  const size = 180
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, progressPercentage))
  const dash = (pct / 100) * c

  return (
    <div
      style={{
        background: `radial-gradient(ellipse at 30% 30%, #2A0B0B 0%, ${bg} 70%)`,
        color: fg,
        borderRadius: 16,
        border: `1px solid ${GOLD}40`,
        padding: 24,
        fontFamily: 'var(--font-display, system-ui)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ticker stripe across the top */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: '0 0 auto 0', height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${GOLD} 50%, transparent 100%)`,
        }}
      />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.65, textTransform: 'uppercase' }}>
          Marathon
        </div>
        <div style={{ fontSize: fluidSize(18, 26), fontWeight: 900, letterSpacing: '0.05em', color: GOLD, marginTop: 4, textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>
          Reach the Finish
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 20,
          alignItems: 'center',
        }}
      >
        {/* Left: current / target */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.6, textTransform: 'uppercase' }}>Progress</div>
          <div style={{ fontSize: fluidSize(24, 36), fontWeight: 900, color: GOLD, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 4, fontFamily: 'Georgia, serif' }}>
            {currentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            of {targetValue.toLocaleString()}
          </div>
        </div>

        {/* Ring */}
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${GOLD}20`} strokeWidth={stroke} />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={GOLD}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ filter: `drop-shadow(0 0 6px ${GOLD}80)` }}
            />
          </svg>
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: fluidSize(28, 44), fontWeight: 900, color: GOLD, lineHeight: 1, fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(pct)}%
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', opacity: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
              Complete
            </div>
          </div>
        </div>

        {/* Right: reward */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.6, textTransform: 'uppercase' }}>Prize</div>
          <div style={{ fontSize: fluidSize(15, 20), fontWeight: 900, color: fg, marginTop: 4, lineHeight: 1.15 }}>
            {rewardLabel}
          </div>
          <button
            type="button"
            disabled={!completed || claimed}
            onClick={onClaim}
            style={{
              marginTop: 12,
              padding: '10px 18px',
              borderRadius: 6,
              background: completed && !claimed
                ? `linear-gradient(180deg, #F5E19A 0%, ${GOLD} 60%, #7A5A1A 100%)`
                : 'rgba(255,255,255,0.04)',
              color: completed && !claimed ? '#0B0704' : `${fg}80`,
              border: `1px solid ${GOLD}${completed ? 'AA' : '30'}`,
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: completed && !claimed ? 'pointer' : 'default',
              boxShadow: completed && !claimed ? `0 6px 20px -6px ${GOLD}80` : 'none',
            }}
          >
            {claimed ? 'Claimed' : completed ? 'Claim Prize' : 'Keep Going'}
          </button>
        </div>
      </div>
    </div>
  )
}
