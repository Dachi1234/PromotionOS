'use client'

import { useState, useMemo, useEffect } from 'react'
import { useEditor, Element } from '@craftjs/core'
import { X, Search, Sparkles, Disc, Trophy, Target, BarChart3, DollarSign, UserPlus, Gift, type LucideIcon } from 'lucide-react'
import { resolver } from '@/lib/resolver'
import type { TemplateStyle } from '@/components/templates/shared-types'

/**
 * Full-screen template gallery modal.
 *
 * Every (widgetType × style) combination gets its own card: click a card and
 * that widget is inserted onto the canvas, pre-configured with the chosen
 * template style. This is the "browse everything at once" surface that
 * complements the narrower in-settings picker on already-placed widgets.
 *
 * Ported from the Claude Design handoff — the shell (header + search + side
 * filters + card grid) mirrors that prototype.
 */

interface GalleryEntry {
  id: string                     // unique card id, e.g. "wheel-neon"
  widgetType: WidgetType
  style: TemplateStyle | string  // wheel uses TemplateStyle; others use their own literal keys
  name: string                   // "Neon Arcade"
  description: string
  previewBg: string              // preview card background color
  previewAccent: string
  tags?: string[]
}

type WidgetType = 'wheel' | 'leaderboard' | 'mission' | 'progress' | 'cashout' | 'optin' | 'rewards'

const WIDGET_META: Record<WidgetType, { label: string; icon: LucideIcon; resolverKey: keyof typeof resolver }> = {
  wheel:       { label: 'Wheel',       icon: Disc,        resolverKey: 'WheelWidget' },
  leaderboard: { label: 'Leaderboard', icon: Trophy,      resolverKey: 'LeaderboardWidget' },
  mission:     { label: 'Mission',     icon: Target,      resolverKey: 'MissionWidget' },
  progress:    { label: 'Progress',    icon: BarChart3,   resolverKey: 'ProgressBarWidget' },
  cashout:     { label: 'Cashout',     icon: DollarSign,  resolverKey: 'CashoutWidget' },
  optin:       { label: 'Opt-In',      icon: UserPlus,    resolverKey: 'OptInButtonWidget' },
  rewards:     { label: 'Rewards',     icon: Gift,        resolverKey: 'RewardHistoryWidget' },
}

const GALLERY: GalleryEntry[] = [
  // Wheel — only three serious families survive the cull.
  { id: 'wheel-stadium',    widgetType: 'wheel', style: 'stadium',    name: 'Stadium Wheel',     description: 'Multi-ring navy + emerald with gold rim. Sportsbook-grade.', previewBg: '#0F2447', previewAccent: '#1DB954', tags: ['sports', 'serious', 'multi-ring'] },
  { id: 'wheel-jackpot',    widgetType: 'wheel', style: 'jackpot',    name: 'Jackpot Wheel',     description: 'Vegas slot-floor gold & crimson with bulbs.',                 previewBg: '#0E0B10', previewAccent: '#C9A24B', tags: ['casino', 'jackpot', 'gold'] },
  { id: 'wheel-casino-vip', widgetType: 'wheel', style: 'casino_vip', name: 'Casino VIP Wheel',  description: 'Emerald baize + polished brass rim with VIP monogram hub.',  previewBg: '#063720', previewAccent: '#D4AF37', tags: ['casino', 'vip', 'serious'] },

  // Defaults — every non-wheel widget ships a "serious" inline template.
  { id: 'mission-serious',     widgetType: 'mission',     style: 'serious', name: 'Mission Steps',        description: 'Gold-rail numbered step cards. Active step highlighted.',    previewBg: '#0B1220', previewAccent: '#D4AF37', tags: ['mission', 'serious', 'steps'] },
  { id: 'leaderboard-serious', widgetType: 'leaderboard', style: 'serious', name: 'Leaderboard Table',    description: 'Dark navy ranked table with gold top-3 accents.',             previewBg: '#0B1220', previewAccent: '#D4AF37', tags: ['ranking', 'serious'] },
  { id: 'progress-serious',    widgetType: 'progress',    style: 'serious', name: 'Progress Bar',         description: 'Simple gold-filled progress bar with tabular numerics.',      previewBg: '#0B1220', previewAccent: '#D4AF37', tags: ['progress', 'serious'] },
  { id: 'cashout-serious',     widgetType: 'cashout',     style: 'serious', name: 'Cashout Card',         description: 'Single-claim cashout panel with gold accents.',                previewBg: '#0B1220', previewAccent: '#D4AF37', tags: ['cashout', 'serious'] },

  // Crocobet-inspired serious templates.
  { id: 'mission-fast-games-quest',   widgetType: 'mission',     style: 'fast_games_quest', name: 'Fast Games Quest',      description: 'Vertical quest track with gold medallions. Radial-purple hero.', previewBg: '#1B1030', previewAccent: '#E8B448', tags: ['mission', 'quest', 'arcade'] },
  { id: 'leaderboard-spin-games',     widgetType: 'leaderboard', style: 'spin_games',       name: 'Spin Games Podium',     description: 'Gold/silver/bronze podium for top-3 above ranked table.',        previewBg: '#1A0F2A', previewAccent: '#FFD76A', tags: ['ranking', 'podium'] },
  { id: 'progress-marathon',          widgetType: 'progress',    style: 'marathon',         name: 'Marathon Ring',         description: 'Huge progress ring flanked by tally + prize + claim CTA.',       previewBg: '#2A0B0B', previewAccent: '#D4AF37', tags: ['progress', 'marathon', 'hero'] },
  { id: 'cashout-egt-cashback',       widgetType: 'cashout',     style: 'egt_cashback',     name: 'EGT Cashback',          description: 'Tiered cashback conditions with per-row progress chips.',        previewBg: '#1A1030', previewAccent: '#D4AF37', tags: ['cashout', 'tiered', 'cashback'] },
]

interface TemplateGalleryProps {
  open: boolean
  onClose: () => void
}

export function TemplateGallery({ open, onClose }: TemplateGalleryProps) {
  const { actions, query: editorQuery } = useEditor()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | WidgetType>('all')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GALLERY.filter((e) => {
      if (filter !== 'all' && e.widgetType !== filter) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.includes(q))
      )
    })
  }, [query, filter])

  /** Add a widget to the ROOT canvas with the chosen template pre-applied.
   *  Uses Craft.js's parseReactElement → NodeTree pipeline (the same path
   *  the left-rail tiles take via `connectors.create`), which avoids
   *  version-specific quirks of `actions.add`. */
  const insert = (entry: GalleryEntry) => {
    const resolverKey = WIDGET_META[entry.widgetType].resolverKey
    const Component = resolver[resolverKey] as unknown as React.ComponentType<Record<string, unknown>>
    const element = <Element is={Component} canvas={false} template={entry.style} />
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = (editorQuery as any).parseReactElement(element).toNodeTree()
      actions.addNodeTree(tree, 'ROOT')
    } catch (err) {
      console.error('[template-gallery] insert failed', err)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="template-gallery-backdrop" onClick={onClose} role="presentation">
      <div className="template-gallery" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal aria-label="Template Gallery">
        <header className="template-gallery-header">
          <div className="template-gallery-title">
            <Sparkles size={16} style={{ color: 'var(--builder-accent)' }} />
            <span>Template Gallery</span>
            <span className="template-gallery-count">{filtered.length} templates</span>
          </div>
          <div className="template-gallery-search">
            <Search size={14} />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
            />
          </div>
          <button type="button" className="builder-btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </header>

        <div className="template-gallery-body">
          <nav className="template-gallery-nav">
            <button
              type="button"
              className={`template-gallery-nav-item${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <Sparkles size={14} /> All <span className="template-gallery-nav-count">{GALLERY.length}</span>
            </button>
            {(Object.keys(WIDGET_META) as WidgetType[]).map((key) => {
              const meta = WIDGET_META[key]
              const Icon = meta.icon
              const count = GALLERY.filter((e) => e.widgetType === key).length
              return (
                <button
                  key={key}
                  type="button"
                  className={`template-gallery-nav-item${filter === key ? ' active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  <Icon size={14} /> {meta.label} <span className="template-gallery-nav-count">{count}</span>
                </button>
              )
            })}
          </nav>

          <main className="template-gallery-grid">
            {filtered.length === 0 && (
              <div className="template-gallery-empty">
                No templates match <strong>&ldquo;{query}&rdquo;</strong>.
              </div>
            )}
            {filtered.map((entry) => {
              const Icon = WIDGET_META[entry.widgetType].icon
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="template-gallery-card"
                  onClick={() => insert(entry)}
                  title={`Insert ${entry.name}`}
                >
                  <div
                    className="template-gallery-card-preview"
                    style={{ background: entry.previewBg }}
                  >
                    <PreviewShape widgetType={entry.widgetType} accent={entry.previewAccent} />
                    <div className="template-gallery-card-badge">
                      <Icon size={11} /> {WIDGET_META[entry.widgetType].label}
                    </div>
                  </div>
                  <div className="template-gallery-card-meta">
                    <div className="template-gallery-card-name">{entry.name}</div>
                    <div className="template-gallery-card-desc">{entry.description}</div>
                  </div>
                </button>
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}

/** Schematic preview per widget type — not pixel-perfect, but operators can
 *  tell a wheel from a leaderboard at a glance. */
function PreviewShape({ widgetType, accent }: { widgetType: WidgetType; accent: string }) {
  switch (widgetType) {
    case 'wheel':
      return (
        <svg viewBox="0 0 80 80" width={96} height={96} aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            const b = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2
            const r = 34
            return (
              <path
                key={i}
                d={`M40 40 L ${40 + r * Math.cos(a)} ${40 + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${40 + r * Math.cos(b)} ${40 + r * Math.sin(b)} Z`}
                fill={i % 2 ? accent : 'rgba(255,255,255,0.85)'}
                opacity={i % 2 ? 0.9 : 0.25}
              />
            )
          })}
          <circle cx={40} cy={40} r={5} fill="#fff" />
        </svg>
      )
    case 'leaderboard':
      return (
        <svg viewBox="0 0 80 60" width={110} height={80} aria-hidden>
          <rect x={6}  y={32} width={18} height={22} rx={2} fill={accent} opacity={0.6} />
          <rect x={30} y={18} width={18} height={36} rx={2} fill={accent} />
          <rect x={54} y={38} width={18} height={16} rx={2} fill={accent} opacity={0.4} />
        </svg>
      )
    case 'mission':
      return (
        <svg viewBox="0 0 100 40" width={130} height={52} aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={i}>
              <circle cx={12 + i * 26} cy={20} r={6} fill={i < 2 ? accent : 'rgba(255,255,255,0.3)'} />
              {i < 3 && <rect x={18 + i * 26} y={19} width={14} height={2} fill={accent} opacity={i < 1 ? 0.8 : 0.3} />}
            </g>
          ))}
        </svg>
      )
    case 'progress':
      return (
        <svg viewBox="0 0 120 20" width={150} height={26} aria-hidden>
          <rect x={0} y={4} width={120} height={12} rx={6} fill="rgba(255,255,255,0.15)" />
          <rect x={0} y={4} width={78} height={12} rx={6} fill={accent} />
        </svg>
      )
    case 'cashout':
      return (
        <svg viewBox="0 0 60 60" width={80} height={80} aria-hidden>
          <rect x={8} y={10} width={44} height={44} rx={6} fill={accent} opacity={0.2} stroke={accent} strokeWidth={1.5} />
          <circle cx={30} cy={30} r={9} fill="none" stroke={accent} strokeWidth={2} />
          <rect x={26} y={30} width={8} height={14} rx={1.5} fill={accent} />
        </svg>
      )
    case 'optin':
      return (
        <svg viewBox="0 0 120 40" width={150} height={52} aria-hidden>
          <rect x={10} y={8} width={100} height={24} rx={12} fill={accent} />
          <rect x={28} y={15} width={64} height={3} rx={1.5} fill="#fff" opacity={0.8} />
          <rect x={40} y={22} width={40} height={2} rx={1} fill="#fff" opacity={0.4} />
        </svg>
      )
    case 'rewards':
      return (
        <svg viewBox="0 0 80 80" width={100} height={100} aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const x = 8 + (i % 2) * 34
            const y = 8 + Math.floor(i / 2) * 34
            return <rect key={i} x={x} y={y} width={30} height={30} rx={4} fill={accent} opacity={0.35 + i * 0.15} />
          })}
        </svg>
      )
  }
}
