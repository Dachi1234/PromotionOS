'use client'

/**
 * LuxeLeaderboard — token-driven leaderboard with animated row reorders.
 *
 * Uses <RankRise>/<RankItem> so when scores update (via SSE push) rows
 * smoothly slide past each other instead of swapping in place. The current
 * player's row is subtly backgrounded with the accent token.
 *
 * Everything colored is a theme token: the card surface (`bg-card`), the
 * rank badges (gold/silver/bronze for top 3 via `bg-gradient-win`, then
 * accent for everyone else), the "you" pill, and the empty-slot dashes.
 */

import { motion } from 'framer-motion'
import type { LeaderboardTemplateProps } from '../shared-types'
import { RankRise, RankItem } from '@/components/motion/rank-rise'
import { CountUp } from '@/components/motion/count-up'

function rankAccent(rank: number): string {
  if (rank === 1) return 'bg-gradient-win text-card-foreground'
  if (rank === 2) return 'bg-[hsl(0_0%_75%)] text-[hsl(0_0%_15%)]'
  if (rank === 3) return 'bg-[hsl(25_70%_50%)] text-white'
  return 'bg-accent text-accent-foreground'
}

function trendGlyph(trend: 'up' | 'down' | 'same'): string {
  if (trend === 'up') return '▲'
  if (trend === 'down') return '▼'
  return '–'
}

function trendColor(trend: 'up' | 'down' | 'same'): string {
  if (trend === 'up') return 'text-success'
  if (trend === 'down') return 'text-destructive'
  return 'text-muted-foreground'
}

export function LuxeLeaderboard({
  entries,
  currentPlayerRank,
  totalParticipants,
  lastUpdated,
  title,
  timeWindow,
  page,
  totalPages,
  onPageChange,
}: LeaderboardTemplateProps): React.JSX.Element {
  return (
    <div className="rounded-[var(--radius)] bg-card text-card-foreground border border-border shadow-card overflow-hidden w-full max-w-md mx-auto">
      {/* Header — uses the hero gradient so each theme paints its own banner */}
      <div className="bg-gradient-hero px-4 sm:px-5 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {timeWindow}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          <CountUp value={totalParticipants} /> players · Updated {lastUpdated}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        <RankRise>
          {entries.map((e) => (
            <RankItem
              key={`row-${e.displayName}-${e.rank}`}
              itemKey={`row-${e.displayName}-${e.rank}`}
              highlight={e.isCurrentPlayer}
              className="px-4 py-3 min-h-[44px] flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-card shrink-0 ${rankAccent(e.rank)}`}
              >
                {e.rank}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{e.displayName}</span>
                  {e.isCurrentPlayer && (
                    <span className="text-[10px] uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-semibold">
                      you
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono font-bold tabular-nums text-base">
                  <CountUp value={e.value} />
                </div>
                <div className={`text-[11px] font-medium ${trendColor(e.trend)}`}>
                  {trendGlyph(e.trend)}
                </div>
              </div>
            </RankItem>
          ))}
        </RankRise>

        {entries.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No entries on this page.
          </div>
        )}
      </div>

      {/* "You are here" — sticky footer when the current player isn't in view */}
      {currentPlayerRank && !entries.some((e) => e.isCurrentPlayer) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-2 border-t border-border bg-accent/10 text-xs font-medium flex items-center justify-between"
        >
          <span className="text-muted-foreground">Your rank</span>
          <span className="font-bold text-accent">#{currentPlayerRank}</span>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-xs font-medium px-3 py-2 min-h-[44px] min-w-[44px] rounded disabled:opacity-40 hover:text-primary"
          >
            ← Prev
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="text-xs font-medium px-3 py-2 min-h-[44px] min-w-[44px] rounded disabled:opacity-40 hover:text-primary"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
