'use client'

import { useMemo } from 'react'
import { Crown, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeaderboardTemplateProps } from '../shared-types'

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'] as const

function initialsColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${((h % 360) + 360) % 360}, 55%, 50%)`
}

function Avatar({ name, size = 40, ring }: { name: string; size?: number; ring?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: initialsColor(name), color: '#fff',
        boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
      }}
    >
      {initials}
    </div>
  )
}

function TrendIcon({ trend, size = 14 }: { trend: 'up' | 'down' | 'same'; size?: number }) {
  if (trend === 'up') return <TrendingUp size={size} className="text-emerald-500" />
  if (trend === 'down') return <TrendingDown size={size} className="text-red-500" />
  return <Minus size={size} className="text-gray-400" />
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diff < 60) return `Updated ${diff}s ago`
  if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`
  return `Updated ${Math.floor(diff / 3600)}h ago`
}

export function PodiumLeaderboard({
  entries, currentPlayerRank, totalParticipants, lastUpdated,
  title, timeWindow, page, totalPages, onPageChange,
  accentColor = '#6366f1', textColor = '#1e1b4b', bgColor = '#ffffff',
}: LeaderboardTemplateProps) {
  const top3 = useMemo(() => entries.filter(e => e.rank <= 3), [entries])
  const rest = useMemo(() => entries.filter(e => e.rank > 3), [entries])
  const podiumOrder = useMemo(() => {
    const m = new Map(top3.map(e => [e.rank, e]))
    return [m.get(2), m.get(1), m.get(3)].filter(Boolean) as typeof top3
  }, [top3])
  const currentVisible = entries.some(e => e.isCurrentPlayer)
  const heights = [88, 112, 68]

  return (
    <div className="flex flex-col w-full max-w-md mx-auto font-sans" style={{ background: bgColor, color: textColor }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${accentColor}18`, color: accentColor }}>
            {timeWindow}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs opacity-60">{totalParticipants.toLocaleString()} participants</span>
          <span className="text-xs opacity-40">·</span>
          <span className="text-xs opacity-50">{timeAgo(lastUpdated)}</span>
        </div>
      </div>

      {/* Podium */}
      {podiumOrder.length > 0 && (
        <div className="flex items-end justify-center gap-2 px-4 pt-4 pb-2">
          {podiumOrder.map((entry, i) => {
            const medalIdx = entry.rank - 1
            const medal = MEDAL[medalIdx]
            return (
              <div key={entry.rank} className="flex flex-col items-center" style={{ width: entry.rank === 1 ? 110 : 90 }}>
                <div className="relative mb-1">
                  {entry.rank === 1 && <Crown size={20} className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ color: medal }} />}
                  <Avatar name={entry.displayName} size={entry.rank === 1 ? 52 : 42} ring={medal} />
                </div>
                <span className="text-xs font-semibold truncate max-w-full text-center">{entry.displayName}</span>
                <span className="text-xs font-bold mt-0.5" style={{ color: medal }}>{entry.value.toLocaleString()}</span>
                <div
                  className="w-full rounded-t-lg mt-1 flex items-end justify-center"
                  style={{ height: heights[i], background: `${medal}25`, borderTop: `3px solid ${medal}` }}
                >
                  <span className="text-2xl font-black pb-2" style={{ color: medal }}>#{entry.rank}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="px-4 flex flex-col gap-0.5 mt-2">
        {rest.map(entry => (
          <div
            key={entry.rank}
            className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors"
            style={{
              background: entry.isCurrentPlayer ? `${accentColor}12` : 'transparent',
              border: entry.isCurrentPlayer ? `1px solid ${accentColor}30` : '1px solid transparent',
            }}
          >
            <span className="w-7 text-sm font-semibold text-right opacity-70">#{entry.rank}</span>
            <Avatar name={entry.displayName} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{entry.displayName}</span>
                {entry.isCurrentPlayer && (
                  <span className="text-[10px] font-bold px-1.5 py-px rounded-full text-white" style={{ background: accentColor }}>
                    You
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums">{entry.value.toLocaleString()}</span>
            <TrendIcon trend={entry.trend} />
          </div>
        ))}
      </div>

      {/* Current player sticky bar */}
      {!currentVisible && currentPlayerRank != null && (
        <div
          className="sticky bottom-0 mx-4 mb-2 mt-3 flex items-center gap-3 py-2.5 px-4 rounded-xl"
          style={{ background: accentColor, color: '#fff', boxShadow: `0 4px 16px ${accentColor}40` }}
        >
          <span className="font-bold text-sm">#{currentPlayerRank}</span>
          <span className="flex-1 text-sm font-medium">Your rank</span>
          <button
            onClick={() => {
              const targetPage = Math.ceil(currentPlayerRank / entries.length) || 1
              onPageChange(Math.min(targetPage, totalPages))
            }}
            className="text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
          >
            Jump to my rank
          </button>
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
