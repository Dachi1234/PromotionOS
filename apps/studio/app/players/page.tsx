'use client'

import { useState } from 'react'
import { Plus, Copy, Check, Key } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { usePlayers, useCreatePlayer, useCreateSession } from '@/hooks/use-players'

export default function PlayersPage() {
  const [page] = useState(1)
  const { data, isLoading } = usePlayers({ page, limit: 20 })
  const createPlayer = useCreatePlayer()
  const createSession = useCreateSession()
  const [showForm, setShowForm] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    let success = 0
    let failed = 0
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, j) => { row[h] = values[j] ?? '' })
      
      try {
        await createPlayer.mutateAsync({
          displayName: row['displayname'] || row['name'] || `Player ${i}`,
          email: row['email'] || undefined,
          externalId: row['externalid'] || `csv-${Date.now()}-${i}`,
          vipTier: row['viptier'] || 'bronze',
          segmentTags: row['segmenttags'] ? row['segmenttags'].split(';').map(s => s.trim()) : [],
          totalDepositsGel: Number(row['totaldeposits']) || 0,
          registrationDate: row['registrationdate'] ? new Date(row['registrationdate']) : new Date(),
        })
        success++
      } catch {
        failed++
      }
    }
    
    setImporting(false)
    setImportResult({ success, failed })
    e.target.value = ''
  }

  const [form, setForm] = useState({
    displayName: '', email: '', externalId: '', vipTier: 'bronze',
    segmentTags: '', totalDepositsGel: '0', registrationDate: '',
  })

  const handleCreate = async () => {
    await createPlayer.mutateAsync({
      displayName: form.displayName,
      email: form.email || undefined,
      externalId: form.externalId || `ext-${Date.now()}`,
      vipTier: form.vipTier,
      segmentTags: form.segmentTags ? form.segmentTags.split(',').map((s) => s.trim()) : [],
      totalDepositsGel: Number(form.totalDepositsGel) || 0,
      registrationDate: form.registrationDate ? new Date(form.registrationDate) : new Date(),
    })
    setShowForm(false)
    setForm({ displayName: '', email: '', externalId: '', vipTier: 'bronze', segmentTags: '', totalDepositsGel: '0', registrationDate: '' })
  }

  const handleCreateSession = async (playerId: string) => {
    const result = await createSession.mutateAsync(playerId)
    setSessionToken(result.token)
  }

  const copyToken = () => {
    if (sessionToken) {
      navigator.clipboard.writeText(sessionToken)
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Mock Players</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Player
          </button>
            <label className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
              {importing ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={importing} />
            </label>
        </div>

        {sessionToken && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <Key className="h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-400">Session Token Created</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">{sessionToken}</p>
            </div>
            <button onClick={copyToken} className="rounded-md border border-border p-2 hover:bg-accent">
              {copiedToken ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={() => setSessionToken(null)} className="text-xs text-muted-foreground hover:underline">Dismiss</button>
          </div>
        )}

        {importResult && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <p className="text-sm">
              CSV Import: <span className="text-emerald-400 font-medium">{importResult.success} created</span>
              {importResult.failed > 0 && <span className="text-red-400 font-medium ml-2">{importResult.failed} failed</span>}
            </p>
            <button onClick={() => setImportResult(null)} className="text-xs text-muted-foreground hover:underline ml-auto">Dismiss</button>
          </div>
        )}

        {showForm && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-medium">New Player</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Display Name *" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              <input placeholder="External ID" value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              <select value={form.vipTier} onChange={(e) => setForm({ ...form, vipTier: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
              <input placeholder="Segment Tags (comma-separated)" value={form.segmentTags} onChange={(e) => setForm({ ...form, segmentTags: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              <input type="number" placeholder="Total Deposits GEL" value={form.totalDepositsGel} onChange={(e) => setForm({ ...form, totalDepositsGel: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!form.displayName || createPlayer.isPending} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {createPlayer.isPending ? 'Creating...' : 'Create Player'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">External ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">VIP</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Deposits</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : !data?.players?.length ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No players found</td></tr>
              ) : data.players.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{p.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.externalId}</td>
                  <td className="px-4 py-3"><span className="capitalize text-xs rounded-full bg-accent px-2 py-0.5">{p.vipTier}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.segmentTags?.map((tag) => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5">{tag}</span>
                      )) ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.totalDepositsGel} GEL</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCreateSession(p.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Create Session
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
