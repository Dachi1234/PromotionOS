'use client'

import type { MissionTemplateProps } from '@/components/templates/shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * FastGamesQuest — Crocobet "Fast Games / Quest" style.
 *
 * Large numbered gold-circle markers on a vertical track; each step is a
 * dark card with bold step title, reward line, and a right-side progress
 * chip. Active step pops with a warm amber halo; locked steps fade. Meant
 * for a 4-6 step arcade quest (daily missions, tournament ladder).
 */

export function FastGamesQuest({
  steps, onClaim, accentColor, textColor, bgColor,
}: MissionTemplateProps & { claimButtonLabel?: string }) {
  const GOLD = accentColor || '#E8B448'
  const fg = textColor || '#F4ECD8'
  const bg = bgColor || '#0A0E1A'

  return (
    <div
      style={{
        background: `radial-gradient(ellipse at top, #1B1030 0%, ${bg} 70%)`,
        color: fg,
        borderRadius: 14,
        border: `1px solid ${GOLD}35`,
        padding: 20,
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.65, textTransform: 'uppercase' }}>
          Fast Games Quest
        </div>
        <div style={{ fontSize: fluidSize(16, 24), fontWeight: 900, letterSpacing: '0.05em', color: GOLD, marginTop: 4, textTransform: 'uppercase' }}>
          Complete the Mission
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 40 }}>
        {/* Vertical track */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 19, top: 16, bottom: 16,
            width: 2,
            background: `linear-gradient(180deg, ${GOLD}80, ${GOLD}20)`,
          }}
        />
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s) => {
            const done = s.status === 'completed' || s.status === 'claimed'
            const active = s.status === 'active'
            const locked = s.status === 'locked'
            const claimable = s.status === 'completed'
            return (
              <li key={s.order} style={{ position: 'relative' }}>
                {/* Gold numbered medallion on the track */}
                <div
                  style={{
                    position: 'absolute',
                    left: -40, top: 10,
                    width: 40, height: 40,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done
                      ? `radial-gradient(circle at 30% 30%, #FFF0C0, ${GOLD} 60%, #7A5A1A)`
                      : active
                        ? `radial-gradient(circle at 30% 30%, #FFF0C0, ${GOLD} 60%, #8A5A0A)`
                        : `radial-gradient(circle at 30% 30%, #463b1a, #1a1410 70%)`,
                    color: done || active ? '#1a0f05' : `${GOLD}70`,
                    fontWeight: 900,
                    fontSize: 16,
                    boxShadow: active
                      ? `0 0 0 3px ${GOLD}30, 0 0 18px ${GOLD}80`
                      : done
                        ? `0 0 0 2px ${GOLD}55`
                        : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {done ? '✓' : s.order}
                </div>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: active
                      ? `linear-gradient(135deg, ${GOLD}25 0%, rgba(255,255,255,0.02) 60%)`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? GOLD : `${GOLD}20`}`,
                    opacity: locked ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', opacity: 0.6, textTransform: 'uppercase' }}>
                      Step {s.order}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.02em', marginTop: 2 }}>
                      {s.title}
                    </div>
                    {s.description && (
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>{s.description}</div>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: active ? `${GOLD}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${GOLD}40`,
                      fontSize: 11,
                      fontVariantNumeric: 'tabular-nums',
                      color: active ? GOLD : fg,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.currentValue}/{s.targetValue}
                  </div>
                  {claimable && (
                    <button
                      type="button"
                      onClick={() => onClaim(s.order)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        background: `linear-gradient(180deg, #F5E19A 0%, ${GOLD} 60%, #7A5A1A 100%)`,
                        color: '#0B0704',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: `0 4px 12px -4px ${GOLD}80`,
                      }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
