'use client'

import { useState } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import { useLeaderboard } from '@/hooks/use-canvas-data'
import { t } from '@/lib/i18n'
import { TemplatePicker } from '@/components/builder/template-picker'
import type { TemplateStyle, LeaderboardTemplateProps } from '@/components/templates/shared-types'
import { PodiumLeaderboard } from '@/components/templates/leaderboard/podium-leaderboard'
import { CardStackLeaderboard } from '@/components/templates/leaderboard/card-stack-leaderboard'
import { NeonScoreboard } from '@/components/templates/leaderboard/neon-scoreboard'

interface LBProps {
  mechanicId: string
  rowsPerPage: number
  headerText: string
  template: TemplateStyle
  accentColor: string
  textColor: string
  bgColor: string
}

const SAMPLE_ENTRIES: LeaderboardTemplateProps['entries'] = [
  { rank: 1, displayName: 'Player_A***', value: 15200, isCurrentPlayer: false, trend: 'same' as const },
  { rank: 2, displayName: 'Player_B***', value: 12800, isCurrentPlayer: false, trend: 'up' as const },
  { rank: 3, displayName: 'Player_C***', value: 11500, isCurrentPlayer: true, trend: 'down' as const },
  { rank: 4, displayName: 'Player_D***', value: 9300, isCurrentPlayer: false, trend: 'up' as const },
  { rank: 5, displayName: 'Player_E***', value: 8100, isCurrentPlayer: false, trend: 'same' as const },
]

const TEMPLATE_MAP: Record<TemplateStyle, React.ComponentType<LeaderboardTemplateProps>> = {
  classic: PodiumLeaderboard,
  modern: CardStackLeaderboard,
  neon: NeonScoreboard,
}

export const LeaderboardWidget: UserComponent<LBProps> = (props) => {
  const { mechanicId, rowsPerPage, headerText, template, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const { isBuilder, language } = useCanvasStore()
  const { data } = useLeaderboard(isBuilder ? null : mechanicId)
  const [page, setPage] = useState(1)

  const rawEntries = (data?.entries ?? []) as { rank: number; name: string; score: number }[]
  const apiEntries: LeaderboardTemplateProps['entries'] = rawEntries.map((e) => ({
    rank: e.rank,
    displayName: e.name,
    value: e.score,
    isCurrentPlayer: false,
    trend: 'same' as const,
  }))

  const allEntries = isBuilder ? SAMPLE_ENTRIES : apiEntries
  const totalPages = Math.max(1, Math.ceil(allEntries.length / rowsPerPage))
  const paginatedEntries = allEntries.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  const TemplateComponent = TEMPLATE_MAP[template] || PodiumLeaderboard

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={selected ? 'ring-2 ring-blue-500' : ''}>
      <TemplateComponent
        entries={paginatedEntries}
        currentPlayerRank={isBuilder ? 3 : undefined}
        totalParticipants={isBuilder ? 128 : (data as Record<string, unknown>)?.totalParticipants as number ?? 0}
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
    <div className="space-y-0">
      <TemplatePicker widgetType="LEADERBOARD" />
      <div className="space-y-3 p-3">
        <label className="block text-xs font-medium">Bound Mechanic ID</label>
        <input value={props.mechanicId} onChange={(e) => setProp((p: LBProps) => { p.mechanicId = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Rows per Page</label>
        <input type="number" value={props.rowsPerPage} onChange={(e) => setProp((p: LBProps) => { p.rowsPerPage = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <label className="block text-xs font-medium">Header Text</label>
        <input value={props.headerText} onChange={(e) => setProp((p: LBProps) => { p.headerText = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        <hr className="border-gray-700" />
        <label className="block text-xs font-medium">Accent Color</label>
        <input type="color" value={props.accentColor || '#7c3aed'} onChange={(e) => setProp((p: LBProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Text Color</label>
        <input type="color" value={props.textColor || '#ffffff'} onChange={(e) => setProp((p: LBProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        <label className="block text-xs font-medium">Background</label>
        <input type="color" value={props.bgColor || '#1a1a2e'} onChange={(e) => setProp((p: LBProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
      </div>
    </div>
  )
}

LeaderboardWidget.craft = {
  displayName: 'Leaderboard',
  props: {
    mechanicId: '',
    rowsPerPage: 10,
    headerText: 'Leaderboard',
    template: 'classic' as TemplateStyle,
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    bgColor: '#1a1a2e',
  },
  related: { settings: LBSettings },
}
