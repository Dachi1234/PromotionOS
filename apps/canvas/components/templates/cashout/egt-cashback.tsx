'use client'

import type { CashoutTemplateProps } from '@/components/templates/shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * EGTCashback — Crocobet / EGT "Cashback" tiered panel.
 *
 * A stack of tiered condition cards: each row shows the tier's requirement
 * (current / target) with a gold-filled progress chip and a tick or lock.
 * Terminates in a large claim panel with the reward label. Works for any
 * cashout mechanic: N conditions that must all be met to claim.
 */

export function EGTCashback({
  conditions, allConditionsMet, rewardLabel, claimsUsed, maxClaims,
  onClaim, accentColor, textColor, bgColor,
}: CashoutTemplateProps) {
  const GOLD = accentColor || '#D4AF37'
  const fg = textColor || '#F4ECD8'
  const bg = bgColor || '#0A0E1A'
  const claimsLeft = Math.max(0, maxClaims - claimsUsed)

  return (
    <div
      style={{
        background: `linear-gradient(180deg, #1A1030 0%, ${bg} 70%)`,
        color: fg,
        borderRadius: 14,
        border: `1px solid ${GOLD}40`,
        overflow: 'hidden',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div
        style={{
          padding: '18px 20px',
          textAlign: 'center',
          borderBottom: `1px solid ${GOLD}25`,
          background: `linear-gradient(180deg, ${GOLD}18, transparent)`,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.65, textTransform: 'uppercase' }}>
          Cashback
        </div>
        <div style={{ fontSize: fluidSize(20, 30), fontWeight: 900, color: GOLD, marginTop: 4, fontFamily: 'Georgia, serif', letterSpacing: '0.02em' }}>
          {rewardLabel}
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', opacity: 0.55, textTransform: 'uppercase', marginTop: 6 }}>
          {claimsLeft} of {maxClaims} claims available
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conditions.map((c, i) => {
          const pct = c.targetValue > 0 ? Math.min(100, (c.currentValue / c.targetValue) * 100) : c.met ? 100 : 0
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 8,
                background: c.met ? `${GOLD}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${c.met ? GOLD : `${GOLD}25`}`,
              }}
            >
              <div
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c.met ? GOLD : 'transparent',
                  border: `1.5px solid ${GOLD}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.met ? '#0B0704' : GOLD,
                  fontWeight: 900, fontSize: 13,
                }}
              >
                {c.met ? '✓' : i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>
                  {c.label}
                </div>
                <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${GOLD}, #F5E19A)`,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  color: c.met ? GOLD : fg,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {c.currentValue.toLocaleString()}<span style={{ opacity: 0.5 }}>/</span>{c.targetValue.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '4px 16px 18px' }}>
        <button
          type="button"
          disabled={!allConditionsMet || claimsLeft <= 0}
          onClick={onClaim}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 8,
            background: allConditionsMet && claimsLeft > 0
              ? `linear-gradient(180deg, #F5E19A 0%, ${GOLD} 60%, #7A5A1A 100%)`
              : 'rgba(255,255,255,0.04)',
            color: allConditionsMet && claimsLeft > 0 ? '#0B0704' : `${fg}80`,
            border: `1px solid ${GOLD}${allConditionsMet ? 'AA' : '30'}`,
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: allConditionsMet && claimsLeft > 0 ? 'pointer' : 'default',
            boxShadow: allConditionsMet && claimsLeft > 0 ? `0 8px 24px -6px ${GOLD}80` : 'none',
            fontFamily: 'Georgia, serif',
          }}
        >
          {claimsLeft <= 0 ? 'No Claims Left' : allConditionsMet ? 'Claim Cashback' : 'Complete Requirements'}
        </button>
      </div>
    </div>
  )
}
