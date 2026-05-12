'use client'

import type { LeaderboardTemplateProps } from '@/components/templates/shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * SpinGamesLeaderboard — Crocobet "Spin Games" style.
 *
 * A podium header for the top-3 (gold/silver/bronze portrait medallions with
 * scores) sitting above a compact ranked table. Dark panel with gold rim.
 * Highlights the current-player row with a warm amber strip.
 */

export function SpinGamesLeaderboard({
  entries, title, accentColor, textColor, bgColor,
  totalParticipants, lastUpdated,
}: LeaderboardTemplateProps) {
  const GOLD = accentColor || '#D4AF37'
  const fg = textColor || '#F4ECD8'
  const bg = bgColor || '#0A0E1A'

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  const MEDALS = ['#FFD76A', '#D9DCE1', '#C98349'] // gold / silver / bronze

  return (
    <div
      style={{
        background: `linear-gradient(180deg, #1A0F2A 0%, ${bg} 70%)`,
        color: fg,
        borderRadius: 14,
        border: `1px solid ${GOLD}40`,
        overflow: 'hidden',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          textAlign: 'center',
          borderBottom: `1px solid ${GOLD}25`,
          background: `linear-gradient(180deg, ${GOLD}15, transparent)`,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.65, textTransform: 'uppercase' }}>
          Spin Games
        </div>
        <div style={{ fontSize: fluidSize(15, 22), fontWeight: 900, letterSpacing: '0.06em', color: GOLD, marginTop: 2, textTransform: 'uppercase' }}>
          {title}
        </div>
      </div>

      {/* Podium */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          padding: '20px 16px 8px',
          alignItems: 'end',
        }}
      >
        {/* Reorder so gold is visually center */}
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((e) => {
          const medalIdx = top3.indexOf(e)
          const medal = MEDALS[medalIdx]
          const raised = medalIdx === 0
          return (
            <div
              key={e.rank}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 8px',
                borderRadius: 10,
                background: `linear-gradient(180deg, ${medal}22 0%, rgba(0,0,0,0.3) 100%)`,
                border: `1px solid ${medal}60`,
                transform: raised ? 'translateY(-10px)' : 'none',
              }}
            >
              <div
                style={{
                  width: raised ? 58 : 48,
                  height: raised ? 58 : 48,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, #FFF6C0, ${medal} 60%, #5A3A10)`,
                  border: `2px solid ${medal}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: raised ? 22 : 18,
                  color: '#1a0f05',
                  boxShadow: `0 4px 16px ${medal}70`,
                  fontFamily: 'Georgia, serif',
                }}
              >
                {e.rank}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.displayName}
              </div>
              <div style={{ marginTop: 2, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: medal, fontWeight: 900 }}>
                {e.value.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rest */}
      <div style={{ padding: '8px 14px 14px' }}>
        {rest.map((e) => (
          <div
            key={e.rank}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr auto',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              marginBottom: 4,
              background: e.isCurrentPlayer ? `${GOLD}1a` : 'transparent',
              border: e.isCurrentPlayer ? `1px solid ${GOLD}80` : '1px solid transparent',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
              #{e.rank}
            </div>
            <div style={{ fontSize: 12, fontWeight: e.isCurrentPlayer ? 800 : 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.displayName}
            </div>
            <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: GOLD, fontWeight: 700 }}>
              {e.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 18px 14px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55, textAlign: 'center' }}>
        {totalParticipants.toLocaleString()} players · updated {lastUpdated}
      </div>
    </div>
  )
}
