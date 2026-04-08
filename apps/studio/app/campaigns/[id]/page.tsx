'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Pause, Play, Square, Archive,
  ExternalLink, Eye, Dices, Trophy, Target, BarChart3, Coins,
  Settings2, ChevronDown, ChevronUp, Copy,
} from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { StatusBadge } from '@/components/campaign/status-badge'
import { PlayerPreviewButton } from '@/components/campaign/player-preview-button'
import { useCampaign, useTransitionStatus } from '@/hooks/use-campaigns'
import { formatDate, formatDuration } from '@/lib/utils'

const MECHANIC_ICONS: Record<string, typeof Dices> = {
  WHEEL: Dices, WHEEL_IN_WHEEL: Dices,
  LEADERBOARD: Trophy, LEADERBOARD_LAYERED: Trophy,
  MISSION: Target,
  PROGRESS_BAR: BarChart3,
  CASHOUT: Coins,
}

const MECHANIC_LABELS: Record<string, string> = {
  WHEEL: 'Spin-the-Wheel',
  WHEEL_IN_WHEEL: 'Wheel-in-Wheel',
  LEADERBOARD: 'Leaderboard',
  LEADERBOARD_LAYERED: 'Layered Leaderboard',
  MISSION: 'Mission / Challenges',
  PROGRESS_BAR: 'Progress Bar',
  CASHOUT: 'Cashout',
}

interface MechanicRow {
  id: string
  type: string
  config: Record<string, unknown>
  displayOrder: number
  isActive: boolean
}

interface RewardRow {
  id: string
  mechanicId: string
  type: string
  config: Record<string, unknown>
  probabilityWeight: string | null
}

interface AggRow {
  id: string
  mechanicId: string
  sourceEventType: string
  metric: string
  transformation: unknown
  windowType: string
}

function MechanicCard({ mech, rewards, rules }: { mech: MechanicRow; rewards: RewardRow[]; rules: AggRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = MECHANIC_ICONS[mech.type] ?? Settings2

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{MECHANIC_LABELS[mech.type] || mech.type}</p>
          <p className="text-xs text-muted-foreground">
            {rewards.length} reward{rewards.length !== 1 ? 's' : ''} · {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${mech.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
          {mech.isActive ? 'Active' : 'Inactive'}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-4 bg-accent/10">
          {Object.keys(mech.config).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Configuration</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(mech.config).map(([key, val]) => (
                  <div key={key} className="rounded-md bg-background border border-border px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{key}</p>
                    <p className="text-sm font-mono">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rewards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Rewards</p>
              <div className="space-y-1">
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md bg-background border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{r.type}</span>
                    {r.probabilityWeight && (
                      <span className="text-xs text-muted-foreground">Weight: {r.probabilityWeight}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rules.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Aggregation Rules</p>
              <div className="space-y-1">
                {rules.map((r) => (
                  <div key={r.id} className="rounded-md bg-background border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{r.sourceEventType}</span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span>{r.metric}</span>
                    <span className="text-xs text-muted-foreground ml-2">({r.windowType})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useCampaign(params.id)
  const transition = useTransitionStatus()
  const [copied, setCopied] = useState(false)

  if (isLoading) return <AppShell><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AppShell>
  if (!data) return <AppShell><p className="text-center py-20 text-muted-foreground">Campaign not found</p></AppShell>

  const campaign = data.campaign
  const mechs = (data.mechanics ?? []) as MechanicRow[]
  const allRewards = (data.rewardDefinitions ?? []) as RewardRow[]
  const allRules = (data.aggregationRules ?? []) as AggRow[]
  const canvasUrl = process.env.NEXT_PUBLIC_CANVAS_URL ?? 'http://localhost:3002'

  const handleTransition = async (status: string) => {
    await transition.mutateAsync({ id: params.id, status })
  }

  const copyEmbedCode = () => {
    const code = `<iframe src="${canvasUrl}/${campaign.slug}?token=PLAYER_TOKEN" width="100%" style="border:none;" allow="autoplay"></iframe>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLive = campaign.status === 'active' || campaign.status === 'ended'
  const previewUrl = `${canvasUrl}/${campaign.slug}?preview=admin`

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(campaign.startsAt)} — {formatDate(campaign.endsAt)}
              {' · '}
              {formatDuration(new Date(campaign.startsAt), new Date(campaign.endsAt))}
            </p>
          </div>
          <div className="flex gap-2">
            <PlayerPreviewButton campaignSlug={campaign.slug} canvasUrl={canvasUrl} />
            {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'active') && (
              <Link href={`/campaigns/${params.id}/edit`} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            )}
            {campaign.status === 'active' && (
              <>
                <button onClick={() => handleTransition('paused')} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                  <Pause className="h-4 w-4" /> Pause
                </button>
                <button onClick={() => handleTransition('ended')} className="inline-flex items-center gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                  <Square className="h-4 w-4" /> End
                </button>
              </>
            )}
            {campaign.status === 'paused' && (
              <button onClick={() => handleTransition('active')} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90">
                <Play className="h-4 w-4" /> Resume
              </button>
            )}
            {campaign.status === 'ended' && (
              <button onClick={() => handleTransition('archived')} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                <Archive className="h-4 w-4" /> Archive
              </button>
            )}
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="font-mono text-sm">{campaign.slug}</p>
          </div>
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{campaign.currency}</p>
          </div>
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Mechanics</p>
            <p className="font-medium">{mechs.length}</p>
          </div>
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Total Rewards</p>
            <p className="font-medium">{allRewards.length}</p>
          </div>
        </div>

        {campaign.description && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{campaign.description}</p>
          </div>
        )}

        {/* Mechanics */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Mechanics</h2>
          {mechs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <Settings2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No mechanics configured yet</p>
              {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                <Link href={`/campaigns/${params.id}/edit`} className="text-xs text-primary hover:underline mt-2 inline-block">
                  Edit campaign to add mechanics
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {mechs
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((m) => (
                  <MechanicCard
                    key={m.id}
                    mech={m}
                    rewards={allRewards.filter((r) => r.mechanicId === m.id)}
                    rules={allRules.filter((r) => r.mechanicId === m.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Frontend Preview */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Frontend Page</h2>
          {campaign.canvasConfig ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-accent/30 border-b border-border">
                <p className="text-sm font-medium">Canvas Preview</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Open live page
                  </a>
                  <a
                    href={`${canvasUrl}/builder/${params.id}?jwt=${typeof window !== 'undefined' ? localStorage.getItem('studio_jwt') ?? '' : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Edit in builder
                  </a>
                </div>
              </div>
              <div className="bg-gray-800 flex justify-center p-6">
                <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden" style={{ width: 375, minHeight: 300 }}>
                  <iframe
                    src={previewUrl}
                    className="w-full border-0"
                    style={{ height: 500 }}
                    title="Campaign preview"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <Eye className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No page designed yet</p>
              <Link
                href={`/campaigns/${params.id}/edit`}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Open the page builder in Step 6
              </Link>
            </div>
          )}
        </div>

        {/* Embed Code */}
        {isLive && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Embed Code</h2>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste this iframe code into your website to display the promotion page:
              </p>
              <div className="relative">
                <pre className="rounded-md bg-accent/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {`<iframe src="${canvasUrl}/${campaign.slug}?token=PLAYER_TOKEN" width="100%" style="border:none;" allow="autoplay"></iframe>`}
                </pre>
                <button
                  onClick={copyEmbedCode}
                  className="absolute top-2 right-2 rounded-md bg-background border border-border p-1.5 hover:bg-accent"
                >
                  {copied ? <span className="text-[10px] text-emerald-400">Copied!</span> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Replace <code className="bg-accent px-1 rounded">PLAYER_TOKEN</code> with the player&apos;s session token from your authentication system.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
