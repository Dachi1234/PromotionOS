'use client'

import { useState } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useLeaderboard } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { MechanicPicker } from '@/components/builder/mechanic-picker'
import { CapabilityPanel } from '@/components/builder/capability-panel'
import type { LeaderboardTemplateProps } from '@/components/templates/shared-types'
import { SpinGamesLeaderboard } from '@/components/templates/leaderboard/spin-games-leaderboard'
import {
  WidgetSkeleton,
  WidgetEmpty,
  WidgetError,
  WidgetIneligible,
} from '@/components/shared/widget-state'

type LBTemplateKey = 'serious' | 'spin_games'

interface LBProps {
  mechanicId: string
  rowsPerPage: number
  headerText: string
  template: LBTemplateKey
  accentColor: string
  textColor: string
  bgColor: string
}

const SAMPLE_ENTRIES: LeaderboardTemplateProps['entries'] = [
  { rank: 1,  displayName: 'Luka T****',     value: 48_920, isCurrentPlayer: false, trend: 'same' },
  { rank: 2,  displayName: 'Nino K****',     value: 41_105, isCurrentPlayer: false, trend: 'up' },
  { rank: 3,  displayName: 'Tornike D****',  value: 37_640, isCurrentPlayer: false, trend: 'up' },
  { rank: 4,  displayName: 'You (Giorgi)',   value: 32_418, isCurrentPlayer: true,  trend: 'up' },
  { rank: 5,  displayName: 'Mariam B****',   value: 29_750, isCurrentPlayer: false, trend: 'down' },
  { rank: 6,  displayName: 'Levan A****',    value: 26_330, isCurrentPlayer: false, trend: 'same' },
  { rank: 7,  displayName: 'Nika S****',     value: 22_980, isCurrentPlayer: false, trend: 'up' },
  { rank: 8,  displayName: 'Anna C****',     value: 19_050, isCurrentPlayer: false, trend: 'down' },
  { rank: 9,  displayName: 'Giorgi P****',   value: 15_700, isCurrentPlayer: false, trend: 'down' },
  { rank: 10, displayName: 'Saba M****',     value: 12_435, isCurrentPlayer: false, trend: 'same' },
]

/**
 * Inline "serious default" renderer — no template families here anymore.
 * Dark navy table with gold accent on top-3 and a highlighted current-player
 * row. Operators still get accent/text/bg color knobs for brand alignment.
 */
function SeriousLeaderboard({
  entries, title, accentColor, textColor, bgColor,
  currentPlayerRank, totalParticipants, lastUpdated,
  page, totalPages, onPageChange,
}: LeaderboardTemplateProps) {
  const GOLD = accentColor || '#D4AF37'
  return (
    <div
      style={{
        background: bgColor || '#0B1220',
        color: textColor || '#E9EEF5',
        borderRadius: 10,
        border: `1px solid ${GOLD}40`,
        overflow: 'hidden',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${GOLD}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(180deg, ${GOLD}18 0%, transparent 100%)`,
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 13 }}>
          {title}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {totalParticipants.toLocaleString()} players · {lastUpdated}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55 }}>Rank</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55 }}>Player</th>
            <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.55 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isTop = e.rank <= 3
            return (
              <tr
                key={e.rank}
                style={{
                  background: e.isCurrentPlayer ? `${GOLD}22` : 'transparent',
                  borderTop: `1px solid ${GOLD}14`,
                }}
              >
                <td style={{ padding: '10px 14px', fontWeight: 800, color: isTop ? GOLD : 'inherit', width: 48 }}>
                  {e.rank}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: e.isCurrentPlayer ? 800 : 500 }}>
                  {e.displayName}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {e.value.toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderTop: `1px solid ${GOLD}20`,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{ background: 'none', color: 'inherit', opacity: page === 1 ? 0.3 : 0.8, border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            ‹ Prev
          </button>
          <span style={{ opacity: 0.6 }}>
            Page {page} / {totalPages}
            {currentPlayerRank != null && ` · You: #${currentPlayerRank}`}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{ background: 'none', color: 'inherit', opacity: page === totalPages ? 0.3 : 0.8, border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}

export const LeaderboardWidget: UserComponent<LBProps> = (props) => {
  const { mechanicId, rowsPerPage, headerText, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, language } = useCanvasStore()
  const { data, isLoading, error } = useLeaderboard(isBuilder ? null : mechanicId)
  const [page, setPage] = useState(1)

  const rawEntries = (data?.entries ?? []) as { rank: number; displayName: string; name?: string; score: number; value?: number; isCurrentPlayer?: boolean; trend?: string }[]
  const apiEntries: LeaderboardTemplateProps['entries'] = rawEntries.map((e) => ({
    rank: e.rank,
    displayName: e.displayName || e.name || 'Player',
    value: e.value ?? e.score ?? 0,
    isCurrentPlayer: e.isCurrentPlayer ?? false,
    trend: (e.trend as 'up' | 'down' | 'same') ?? 'same',
  }))

  const apiPlayerRank = (data as Record<string, unknown>)?.playerRank as number | undefined
  const apiMeta = (data as Record<string, unknown>)?.meta as { totalParticipants?: number } | undefined

  const builderMechanics = useCanvasStore((s) => s.builderMechanics)
  const builderMech = isBuilder ? builderMechanics.find((m) => m.id === mechanicId) : null
  const prizeCount = builderMech?.rewards.length ?? 0

  const builderEntries: LeaderboardTemplateProps['entries'] = prizeCount > 0
    ? SAMPLE_ENTRIES.slice(0, Math.max(prizeCount, 3)).map((e, i) => ({
        ...e,
        displayName: builderMech?.rewards[i]
          ? `${e.displayName} (${builderMech.rewards[i].type})`
          : e.displayName,
      }))
    : SAMPLE_ENTRIES

  const allEntries = isBuilder ? builderEntries : apiEntries
  const totalPages = Math.max(1, Math.ceil(allEntries.length / rowsPerPage))
  const paginatedEntries = allEntries.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const dragRef = (ref: HTMLDivElement | null) => { if (ref) connect(drag(ref)) }
  const ringClass = selected ? 'ring-2 ring-blue-500' : ''

  if (!isBuilder) {
    if (!mechanicId) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetIneligible reason="Leaderboard is not bound to a mechanic yet." />
        </div>
      )
    }
    if (isLoading && allEntries.length === 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetSkeleton lines={5} />
        </div>
      )
    }
    if (error) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetError
            detail={error instanceof Error ? error.message : 'Failed to load leaderboard'}
          />
        </div>
      )
    }
    if (allEntries.length === 0) {
      return (
        <div ref={dragRef} className={ringClass}>
          <WidgetEmpty
            title="No rankings yet"
            description="Be the first to post a score — the board fills in as soon as players start playing."
          />
        </div>
      )
    }
  }

  const Template = template === 'spin_games' ? SpinGamesLeaderboard : SeriousLeaderboard
  return (
    <div ref={dragRef} className={ringClass}>
      <Template
        entries={paginatedEntries}
        currentPlayerRank={isBuilder ? 4 : apiPlayerRank}
        totalParticipants={isBuilder ? 2_347 : apiMeta?.totalParticipants ?? 0}
        lastUpdated={isBuilder ? 'Just now' : new Date().toLocaleTimeString()}
        title={headerText || t(language, 'leaderboard.rank')}
        timeWindow="Weekly"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        accentColor={accentColor}
        textColor={textColor}
        bgColor={bgColor}
      />
    </div>
  )
}

function LBSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as LBProps }))
  return (
    <div className="space-y-3 p-3">
      <MechanicPicker widgetType="LEADERBOARD" />
      <CapabilityPanel widgetType="LEADERBOARD" />
      <label className="block text-xs font-medium">Template</label>
      <select value={props.template} onChange={(e) => setProp((p: LBProps) => { p.template = e.target.value as LBTemplateKey })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="serious">Serious (default)</option>
        <option value="spin_games">Spin Games (podium)</option>
      </select>
      <label className="block text-xs font-medium">Rows per Page</label>
      <input type="number" value={props.rowsPerPage} onChange={(e) => setProp((p: LBProps) => { p.rowsPerPage = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Header Text</label>
      <input value={props.headerText} onChange={(e) => setProp((p: LBProps) => { p.headerText = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: LBProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: LBProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: LBProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

LeaderboardWidget.craft = {
  displayName: 'Leaderboard',
  props: {
    mechanicId: '',
    rowsPerPage: 10,
    headerText: 'Leaderboard',
    template: 'serious' as LBTemplateKey,
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: LBSettings },
}
