'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Megaphone, Clock, Zap, Archive } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { StatusBadge } from '@/components/campaign/status-badge'
import { useCampaigns } from '@/hooks/use-campaigns'
import { formatDate } from '@/lib/utils'

const statusCards = [
  { key: 'active', label: 'Active', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'draft', label: 'Drafts', icon: Megaphone, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  { key: 'ended', label: 'Ended', icon: Archive, color: 'text-red-400', bg: 'bg-red-500/10' },
]

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCampaigns({ status: statusFilter, page, limit: 20 })

  const allCampaigns = useCampaigns({ limit: 1000 })
  const counts: Record<string, number> = {}
  for (const c of allCampaigns.data?.campaigns ?? []) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your promotion campaigns</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {statusCards.map((card) => (
            <button
              key={card.key}
              onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : card.key)}
              className={`rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent ${statusFilter === card.key ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-md p-2 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[card.key] ?? 0}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Currency</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading campaigns...</td></tr>
                ) : !data?.campaigns?.length ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No campaigns found</td></tr>
                ) : (
                  data.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/campaigns/${campaign.id}`} className="hover:text-primary">
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={campaign.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(campaign.startsAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(campaign.endsAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{campaign.currency}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/campaigns/${campaign.id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil((data.meta.totalItems ?? 0) / 20) || 1}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.meta || page >= (data.meta.totalPages ?? 1)}
                  className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
