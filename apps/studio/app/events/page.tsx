'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { useEvents } from '@/hooks/use-players'
import { formatDate } from '@/lib/utils'

export default function EventsPage() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const { data, isLoading } = useEvents({ page, limit: 20, eventType: eventType || undefined })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const events = (data?.events ?? []) as { id: string; playerId: string; eventType: string; payload: unknown; processed: boolean; occurredAt: string }[]

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Event Log</h1>

        <div className="flex items-center gap-4">
          <select
            value={eventType}
            onChange={(e) => { setEventType(e.target.value); setPage(1) }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Event Types</option>
            {['BET', 'DEPOSIT', 'REFERRAL', 'LOGIN', 'FREE_SPIN_USED'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Player</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processed</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payload</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No events found</td></tr>
              ) : events.map((ev) => (
                <>
                  <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer" onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}>
                    <td className="px-4 py-3">
                      {expandedId === ev.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(ev.occurredAt)}</td>
                    <td className="px-4 py-3"><span className="rounded bg-accent px-2 py-0.5 text-xs font-medium">{ev.eventType}</span></td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{ev.playerId.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${ev.processed ? 'text-emerald-400' : 'text-amber-400'}`}>{ev.processed ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono truncate max-w-[200px]">
                      {JSON.stringify(ev.payload).slice(0, 60)}...
                    </td>
                  </tr>
                  {expandedId === ev.id && (
                    <tr key={`${ev.id}-detail`} className="border-b border-border">
                      <td colSpan={6} className="px-8 py-4 bg-accent/20">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
