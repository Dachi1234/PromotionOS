'use client'

/**
 * Story-mode leaderboard — 9:16 vertical full-bleed, hero podium top,
 * scrollable tail below. Designed for a "who's on top" social-share feel.
 */

import { motion } from 'framer-motion'
import type { LeaderboardTemplateProps } from '../shared-types'
import { CountUp } from '@/components/motion/count-up'
import { formatOrdinal } from '@/lib/format'

export function StoryLeaderboard({
  entries,
  title,
  timeWindow,
  currentPlayerRank,
  totalParticipants,
}: LeaderboardTemplateProps): React.JSX.Element {
  const [first, second, third, ...rest] = entries
  const medalFor = (rank: number): string =>
    rank === 1 ? 'bg-gradient-win shadow-win'
      : rank === 2 ? 'bg-muted/80'
      : rank === 3 ? 'bg-accent/30'
      : 'bg-card'

  return (
    <div
      className="relative mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-[var(--radius)] bg-gradient-hero text-card-foreground shadow-glow"
      style={{ aspectRatio: '9 / 16' }}
    >
      <div className="px-5 pt-5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {timeWindow}
        </div>
        <h2 className="mt-1 text-2xl font-bold">{title}</h2>
        <div className="mt-1 text-xs text-muted-foreground">
          {totalParticipants.toLocaleString()} players competing
        </div>
      </div>

      {/* Podium */}
      <div className="mt-4 grid grid-cols-3 items-end gap-2 px-5">
        {[second, first, third].map((e, i) => {
          if (!e) return <div key={i} />
          const isFirst = e === first
          const heightClass = isFirst ? 'h-32' : e === second ? 'h-24' : 'h-20'
          return (
            <motion.div
              key={e.rank}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex flex-col items-center justify-end rounded-t-xl p-3 ${medalFor(e.rank)} ${heightClass}`}
            >
              <div className="text-xs font-bold truncate max-w-full">{e.displayName}</div>
              <div className="text-base font-bold">
                <CountUp value={e.value} />
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {formatOrdinal(e.rank)}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tail */}
      <div className="mt-4 flex-1 overflow-y-auto px-5 pb-5 space-y-2">
        {rest.map((e) => (
          <div
            key={e.rank}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${e.isCurrentPlayer ? 'bg-accent/20 border border-accent/40' : 'bg-card/60'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center text-sm font-bold text-muted-foreground">
                {e.rank}
              </div>
              <div className="text-sm font-medium truncate max-w-[140px]">{e.displayName}</div>
            </div>
            <div className="text-sm font-bold">
              <CountUp value={e.value} />
            </div>
          </div>
        ))}
      </div>

      {currentPlayerRank !== undefined && (
        <div className="border-t border-border bg-card/90 px-5 py-3 text-center text-xs font-medium backdrop-blur">
          You&apos;re {formatOrdinal(currentPlayerRank)} — keep going!
        </div>
      )}
    </div>
  )
}
