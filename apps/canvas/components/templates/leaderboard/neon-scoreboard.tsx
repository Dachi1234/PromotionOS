'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeaderboardTemplateProps } from '../shared-types'

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const

function digitBoxes(value: number, neon: string, bright: boolean) {
  const digits = value.toLocaleString().split('')
  return (
    <div className="flex gap-px">
      {digits.map((d, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center"
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: 14, fontWeight: 700, lineHeight: 1,
            width: d === ',' ? 8 : 18, height: 22,
            color: neon,
            textShadow: bright ? `0 0 6px ${neon}, 0 0 12px ${neon}80` : `0 0 3px ${neon}60`,
            background: d === ',' ? 'transparent' : `${neon}08`,
            border: d === ',' ? 'none' : `1px solid ${neon}20`,
            borderRadius: 3,
          }}
        >
          {d}
        </span>
      ))}
    </div>
  )
}

export function NeonScoreboard({
  entries, currentPlayerRank, totalParticipants, lastUpdated: _lastUpdated,
  title, timeWindow, page, totalPages, onPageChange,
  accentColor = '#00fff5', textColor: _textColor = '#ffffff', bgColor = '#0a0a0f',
}: LeaderboardTemplateProps) {
  const currentVisible = entries.some(e => e.isCurrentPlayer)

  const scanlineStyle = useMemo(() => ({
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)`,
    pointerEvents: 'none' as const,
  }), [])

  function rowNeon(rank: number) {
    if (rank <= 3) return RANK_COLORS[rank - 1]
    return `${accentColor}90`
  }

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden" style={{ fontFamily: "'Courier New', 'Lucida Console', monospace" }}>
      <style>{`
        @keyframes ns-blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes ns-glow{0%,100%{text-shadow:0 0 8px ${accentColor},0 0 16px ${accentColor}60}50%{text-shadow:0 0 14px ${accentColor},0 0 28px ${accentColor}80}}
        @media(prefers-reduced-motion:reduce){.ns-anim{animation:none!important}}
      `}</style>

      {/* CRT frame */}
      <div
        className="rounded-2xl p-px"
        style={{
          background: `linear-gradient(145deg, ${accentColor}30, ${accentColor}08)`,
          boxShadow: `0 0 30px ${accentColor}15, inset 0 0 60px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="rounded-2xl overflow-hidden" style={{ background: bgColor }}>
          {/* Scanline overlay */}
          <div className="absolute inset-0 z-10 rounded-2xl" style={scanlineStyle} />

          {/* Header */}
          <div className="relative z-20 px-5 pt-5 pb-3">
            <h2
              className="text-base font-bold uppercase tracking-[0.2em] text-center ns-anim"
              style={{
                color: accentColor,
                textShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}60`,
                animation: 'ns-glow 3s ease-in-out infinite',
              }}
            >
              {title}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ color: accentColor, border: `1px solid ${accentColor}30`, background: `${accentColor}08` }}
              >
                {timeWindow}
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="relative z-20 px-3 pb-2">
            {entries.map(entry => {
              const neon = rowNeon(entry.rank)
              const isCurrent = entry.isCurrentPlayer
              const isTop3 = entry.rank <= 3

              return (
                <div
                  key={entry.rank}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg mb-0.5"
                  style={{
                    background: isCurrent ? `${accentColor}10` : 'transparent',
                    border: isCurrent ? `1px solid ${accentColor}30` : '1px solid transparent',
                    boxShadow: isCurrent ? `0 0 16px ${accentColor}15, inset 0 0 16px ${accentColor}05` : 'none',
                  }}
                >
                  {/* Rank */}
                  <span
                    className="w-8 text-right font-bold tabular-nums shrink-0"
                    style={{
                      fontSize: isTop3 ? 16 : 13, color: neon,
                      textShadow: isTop3 ? `0 0 8px ${neon}, 0 0 14px ${neon}60` : `0 0 4px ${neon}40`,
                    }}
                  >
                    {String(entry.rank).padStart(2, '0')}
                  </span>

                  {/* Separator */}
                  <span style={{ color: `${accentColor}30` }}>│</span>

                  {/* Name */}
                  <span
                    className="flex-1 min-w-0 truncate text-xs uppercase tracking-wider"
                    style={{
                      color: isCurrent ? accentColor : isTop3 ? neon : `${accentColor}70`,
                      textShadow: isCurrent ? `0 0 6px ${accentColor}80` : isTop3 ? `0 0 4px ${neon}40` : 'none',
                    }}
                  >
                    {entry.displayName}
                    {isCurrent && (
                      <span className="ns-anim ml-1" style={{ animation: 'ns-blink 1s step-end infinite', color: accentColor }}>
                        ▌
                      </span>
                    )}
                  </span>

                  {/* Score digits */}
                  {digitBoxes(entry.value, isTop3 ? neon : `${accentColor}80`, isTop3)}
                </div>
              )
            })}
          </div>

          {/* Current player bar */}
          {!currentVisible && currentPlayerRank != null && (
            <div className="relative z-20 mx-3 mb-2">
              <div
                className="flex items-center justify-between py-2 px-4 rounded-lg"
                style={{ border: `1px solid ${accentColor}40`, background: `${accentColor}08` }}
              >
                <span className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>
                  Your rank: #{currentPlayerRank}
                </span>
                <button
                  onClick={() => {
                    const target = Math.ceil(currentPlayerRank / entries.length) || 1
                    onPageChange(Math.min(target, totalPages))
                  }}
                  className="text-[10px] uppercase tracking-wider underline underline-offset-2"
                  style={{ color: accentColor }}
                >
                  Jump
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="relative z-20 flex items-center justify-between px-5 pb-4 pt-1">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: `${accentColor}50` }}>
              Credits: {totalParticipants.toLocaleString()} players
            </span>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                  className="p-1 disabled:opacity-20 transition-opacity"
                  style={{ color: accentColor }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span
                  className="text-[10px] tabular-nums px-1"
                  style={{ color: accentColor, textShadow: `0 0 4px ${accentColor}60` }}
                >
                  {String(page).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}
                </span>
                <button
                  onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                  className="p-1 disabled:opacity-20 transition-opacity"
                  style={{ color: accentColor }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
