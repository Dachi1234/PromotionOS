'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeaderboardTemplateProps } from '../shared-types'

function initialsColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${((h % 360) + 360) % 360}, 55%, 50%)`
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: initialsColor(name), color: '#fff' }}
    >
      {initials}
    </div>
  )
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'same' }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-500" />
  if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />
  return <Minus size={14} className="text-gray-400" />
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diff < 60) return `Updated ${diff}s ago`
  if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`
  return `Updated ${Math.floor(diff / 3600)}h ago`
}

export function CardStackLeaderboard({
  entries, currentPlayerRank, totalParticipants, lastUpdated,
  title, timeWindow, page, totalPages, onPageChange,
  accentColor = '#6366f1', textColor = '#1e1b4b', bgColor = '#ffffff',
}: LeaderboardTemplateProps) {
  const maxValue = useMemo(() => Math.max(...entries.map(e => e.value), 1), [entries])

  function cardBg(rank: number) {
    if (rank === 1) return `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
    if (rank <= 3) return `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`
    return 'transparent'
  }

  function cardScale(rank: number) {
    if (rank === 1) return 1
    if (rank <= 3) return 0.98
    return 0.96
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto font-sans" style={{ background: bgColor, color: textColor }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {timeWindow}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs opacity-60">{totalParticipants.toLocaleString()} participants</span>
          <span className="text-xs opacity-40">·</span>
          <span className="text-xs opacity-50">{timeAgo(lastUpdated)}</span>
        </div>
      </div>

      {/* Card stack */}
      <div className="flex flex-col gap-2 px-4 pt-2 pb-1">
        {entries.map(entry => {
          const isTop1 = entry.rank === 1
          const isCurrent = entry.isCurrentPlayer
          const progress = (entry.value / maxValue) * 100

          return (
            <div
              key={entry.rank}
              className="relative rounded-xl px-4 transition-transform"
              style={{
                background: cardBg(entry.rank),
                border: isCurrent
                  ? `2px solid ${accentColor}`
                  : entry.rank <= 3
                    ? `1px solid ${accentColor}20`
                    : `1px solid ${textColor}10`,
                boxShadow: isCurrent
                  ? `0 0 20px ${accentColor}30, 0 8px 24px ${accentColor}15`
                  : entry.rank <= 3
                    ? `0 2px 8px ${accentColor}10`
                    : '0 1px 3px rgba(0,0,0,0.04)',
                transform: `scale(${cardScale(entry.rank)})`,
                paddingTop: isTop1 ? 16 : 12,
                paddingBottom: isTop1 ? 16 : 12,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span
                  className="font-black tabular-nums shrink-0"
                  style={{
                    fontSize: isTop1 ? 32 : entry.rank <= 3 ? 24 : 18,
                    lineHeight: 1,
                    color: isTop1 ? '#fff' : entry.rank <= 3 ? accentColor : `${textColor}40`,
                    minWidth: isTop1 ? 44 : 32,
                    textAlign: 'center',
                  }}
                >
                  {entry.rank}
                </span>

                {/* Avatar + name */}
                <Avatar name={entry.displayName} size={isTop1 ? 44 : 34} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: isTop1 ? '#fff' : textColor }}
                    >
                      {entry.displayName}
                    </span>
                    <TrendIcon trend={entry.trend} />
                  </div>
                </div>

                {/* Value */}
                <span
                  className="font-bold tabular-nums text-sm"
                  style={{ color: isTop1 ? '#fff' : textColor }}
                >
                  {entry.value.toLocaleString()}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="h-1 rounded-full mt-2.5 overflow-hidden"
                style={{ background: isTop1 ? 'rgba(255,255,255,0.2)' : `${textColor}08` }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: isTop1 ? '#fff' : accentColor,
                    opacity: isTop1 ? 0.8 : 0.6,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating current-player pill */}
      {currentPlayerRank != null && !entries.some(e => e.isCurrentPlayer) && (
        <div className="flex justify-center py-3">
          <span
            className="text-xs font-bold px-4 py-2 rounded-full"
            style={{
              background: accentColor,
              color: '#fff',
              boxShadow: `0 4px 14px ${accentColor}40`,
            }}
          >
            Your rank: #{currentPlayerRank}
          </span>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-3 px-4">
          <button
            onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="p-1.5 rounded-md disabled:opacity-25 hover:bg-black/5 transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p} onClick={() => onPageChange(p)}
              className="w-8 h-8 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: p === page ? accentColor : 'transparent',
                color: p === page ? '#fff' : textColor,
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="p-1.5 rounded-md disabled:opacity-25 hover:bg-black/5 transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
