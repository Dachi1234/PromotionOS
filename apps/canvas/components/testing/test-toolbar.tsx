'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCanvasStore } from '@/stores/canvas-store'
import { useCampaignDetail, type CampaignDetailData } from '@/hooks/use-canvas-data'

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? 'http://localhost:3000'

interface EventPreset {
  label: string
  eventType: string
  payload: Record<string, unknown>
}

const EVENT_PRESETS: EventPreset[] = [
  { label: 'BET (10 GEL)', eventType: 'BET', payload: { amount: 10, currency: 'GEL', game: 'test-slot' } },
  { label: 'BET (100 GEL)', eventType: 'BET', payload: { amount: 100, currency: 'GEL', game: 'test-slot' } },
  { label: 'DEPOSIT (100 GEL)', eventType: 'DEPOSIT', payload: { amount: 100, currency: 'GEL' } },
  { label: 'LOGIN', eventType: 'LOGIN', payload: {} },
]

async function fireEvent(body: Record<string, unknown>) {
  const res = await fetch(`${ENGINE_URL}/api/v1/events/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function formatDateForInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TestToolbar({ slug }: { slug: string }) {
  const sessionToken = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  const { data: campaignRaw } = useCampaignDetail(slug)
  const campaign = campaignRaw as CampaignDetailData | undefined

  const [collapsed, setCollapsed] = useState(false)
  const [firing, setFiring] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customType, setCustomType] = useState('BET')
  const [customPayload, setCustomPayload] = useState('{ "amount": 50, "currency": "GEL" }')

  // Time travel state
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false)
  const [timeTravelDate, setTimeTravelDate] = useState(formatDateForInput(new Date()))

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const playerId = urlParams?.get('pid') ?? undefined
  const playerName = urlParams?.get('pname') ?? undefined
  const isOptedIn = campaign?.isOptedIn === true
  const campaignId = (campaign?.campaign as Record<string, unknown>)?.id as string | undefined

  const getOccurredAt = useCallback(() => {
    if (timeTravelEnabled && timeTravelDate) {
      return new Date(timeTravelDate).toISOString()
    }
    return new Date().toISOString()
  }, [timeTravelEnabled, timeTravelDate])

  const handleOptIn = useCallback(async () => {
    if (!sessionToken || !slug) return
    try {
      await fetch(`${ENGINE_URL}/api/v1/campaigns/${slug}/opt-in`, {
        method: 'POST',
        headers: { 'x-session-token': sessionToken },
      })
      qc.invalidateQueries({ queryKey: ['campaign-detail'] })
      qc.invalidateQueries({ queryKey: ['player-state'] })
      setLastResult('Opted in successfully')
    } catch (e) {
      setLastResult(`Opt-in failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }, [sessionToken, slug, qc])

  const handleFireEvent = useCallback(async (eventType: string, payload: Record<string, unknown>) => {
    if (!playerId) {
      setLastResult('No player ID — opt in first or check session')
      return
    }
    setFiring(eventType)
    setLastResult(null)
    try {
      const occurredAt = getOccurredAt()
      const result = await fireEvent({
        playerId,
        campaignId,
        eventType,
        payload,
        occurredAt,
      })
      const timeLabel = timeTravelEnabled ? ` @ ${new Date(occurredAt).toLocaleDateString()}` : ''
      if (result.success) {
        setLastResult(`${eventType} event ingested${timeLabel} — refreshing...`)
      } else {
        setLastResult(`Failed: ${result.error?.message ?? 'unknown'}`)
      }
      const refreshQueries = () => {
        qc.invalidateQueries({ queryKey: ['player-state'] })
        qc.invalidateQueries({ queryKey: ['leaderboard'] })
        qc.invalidateQueries({ queryKey: ['mission-state'] })
      }
      refreshQueries()
      setTimeout(refreshQueries, 1500)
      setTimeout(() => {
        refreshQueries()
        if (result.success) setLastResult(`${eventType} event ingested${timeLabel}`)
      }, 3500)
    } catch (e) {
      setLastResult(`Error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setFiring(null)
    }
  }, [playerId, campaignId, qc, getOccurredAt, timeTravelEnabled])

  const handleCustomEvent = useCallback(() => {
    try {
      const parsed = JSON.parse(customPayload)
      handleFireEvent(customType, parsed)
    } catch {
      setLastResult('Invalid JSON payload')
    }
  }, [customType, customPayload, handleFireEvent])

  const handleFinalizeLeaderboard = useCallback(async (mechanicId: string) => {
    setFiring('finalize')
    try {
      const windowDate = timeTravelEnabled ? new Date(timeTravelDate).toISOString() : new Date().toISOString()
      const res = await fetch(`${ENGINE_URL}/api/v1/admin/mechanics/${mechanicId}/finalize-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowDate }),
      })
      const data = await res.json()
      if (data.success) {
        setLastResult(`Leaderboard finalized for ${new Date(windowDate).toLocaleDateString()}`)
        qc.invalidateQueries({ queryKey: ['player-state'] })
        qc.invalidateQueries({ queryKey: ['leaderboard'] })
      } else {
        setLastResult(`Finalize failed: ${data.error?.message ?? 'unknown'}`)
      }
    } catch (e) {
      setLastResult(`Error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setFiring(null)
    }
  }, [timeTravelEnabled, timeTravelDate, qc])

  // Quick time-travel presets
  const handleTimePreset = useCallback((offset: string) => {
    const now = new Date()
    switch (offset) {
      case 'yesterday':
        now.setDate(now.getDate() - 1)
        break
      case 'last-week':
        now.setDate(now.getDate() - 7)
        break
      case 'tomorrow':
        now.setDate(now.getDate() + 1)
        break
      case 'now':
        break
    }
    setTimeTravelDate(formatDateForInput(now))
    setTimeTravelEnabled(true)
  }, [])

  const refreshAll = useCallback(() => {
    qc.invalidateQueries()
    setLastResult('All queries refreshed')
  }, [qc])

  // Extract leaderboard mechanic IDs from campaign for the finalize button
  const campaignMechanics = (campaign?.mechanics ?? []) as { id: string; type: string; config?: unknown }[]
  const leaderboardMechanics = campaignMechanics.filter(
    (m) => m.type === 'LEADERBOARD' || m.type === 'LEADERBOARD_LAYERED',
  )

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed top-2 right-2 z-50 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-violet-500"
      >
        Test Panel
      </button>
    )
  }

  return (
    <div className="bg-gray-950 border-b border-violet-500/30 text-white text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-violet-600/20 border-b border-violet-500/20">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-violet-300">TEST MODE</span>
          {playerName && (
            <span className="text-gray-300">{decodeURIComponent(playerName)}</span>
          )}
          {playerId && (
            <span className="font-mono text-gray-500 text-[10px]">{playerId.slice(0, 8)}...</span>
          )}
          <span className={isOptedIn ? 'text-emerald-400' : 'text-amber-400'}>
            {isOptedIn ? 'Opted In' : 'Not Opted In'}
          </span>
          {timeTravelEnabled && (
            <span className="text-cyan-400 font-medium">
              ⏰ {new Date(timeTravelDate).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="rounded px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300">
            Refresh
          </button>
          <button onClick={() => setCollapsed(true)} className="rounded px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300">
            Collapse
          </button>
        </div>
      </div>

      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        {!isOptedIn && (
          <button
            onClick={handleOptIn}
            className="rounded-md bg-emerald-600 px-3 py-1 font-medium hover:bg-emerald-500"
          >
            Opt In
          </button>
        )}

        <span className="text-gray-500 mx-1">Events:</span>
        {EVENT_PRESETS.map((preset) => (
          <button
            key={`${preset.eventType}-${preset.label}`}
            onClick={() => handleFireEvent(preset.eventType, preset.payload)}
            disabled={firing !== null || !playerId}
            className="rounded-md bg-gray-800 border border-gray-700 px-2.5 py-1 hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {firing === preset.eventType ? '...' : preset.label}
          </button>
        ))}

        <button
          onClick={() => setShowCustom(!showCustom)}
          className="rounded-md bg-gray-800 border border-gray-700 px-2.5 py-1 hover:bg-gray-700 text-violet-400"
        >
          Custom
        </button>

        <span className="text-gray-600 mx-0.5">|</span>

        {/* Time Travel Toggle */}
        <button
          onClick={() => setTimeTravelEnabled(!timeTravelEnabled)}
          className={`rounded-md border px-2.5 py-1 transition-colors ${
            timeTravelEnabled
              ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ⏰ Time Travel
        </button>

        {/* Leaderboard finalize buttons */}
        {leaderboardMechanics.map((m) => (
          <button
            key={m.id}
            onClick={() => handleFinalizeLeaderboard(m.id)}
            disabled={firing !== null}
            className="rounded-md bg-amber-600/30 border border-amber-500/50 px-2.5 py-1 text-amber-300 hover:bg-amber-600/50 disabled:opacity-40"
          >
            {firing === 'finalize' ? '...' : `Finalize ${m.type === 'LEADERBOARD_LAYERED' ? 'LB Layered' : 'Leaderboard'}`}
          </button>
        ))}

        {lastResult && (
          <span className={`ml-2 ${lastResult.startsWith('Failed') || lastResult.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {lastResult}
          </span>
        )}
      </div>

      {/* Time Travel Panel */}
      {timeTravelEnabled && (
        <div className="px-3 pb-2 flex items-center gap-2 border-t border-gray-800 pt-2">
          <span className="text-cyan-400 font-medium">⏰ Simulated Time:</span>
          <input
            type="datetime-local"
            value={timeTravelDate}
            onChange={(e) => setTimeTravelDate(e.target.value)}
            className="rounded bg-gray-800 border border-cyan-500/50 px-2 py-1 text-xs font-mono text-cyan-300"
          />
          <div className="flex gap-1">
            <button
              onClick={() => handleTimePreset('yesterday')}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 hover:bg-gray-700 text-gray-300"
            >
              Yesterday
            </button>
            <button
              onClick={() => handleTimePreset('last-week')}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 hover:bg-gray-700 text-gray-300"
            >
              Last Week
            </button>
            <button
              onClick={() => handleTimePreset('now')}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 hover:bg-gray-700 text-gray-300"
            >
              Now
            </button>
            <button
              onClick={() => handleTimePreset('tomorrow')}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 hover:bg-gray-700 text-gray-300"
            >
              Tomorrow
            </button>
          </div>
          <button
            onClick={() => setTimeTravelEnabled(false)}
            className="rounded bg-red-600/30 border border-red-500/50 px-2 py-0.5 text-red-300 hover:bg-red-600/50 ml-auto"
          >
            Disable
          </button>
        </div>
      )}

      {showCustom && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <select
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs"
          >
            <option value="BET">BET</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="LOGIN">LOGIN</option>
            <option value="REFERRAL">REFERRAL</option>
            <option value="FREE_SPIN_USED">FREE_SPIN_USED</option>
            <option value="MANUAL">MANUAL</option>
          </select>
          <input
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs font-mono"
            placeholder='{"amount": 50}'
          />
          <button
            onClick={handleCustomEvent}
            disabled={firing !== null || !playerId}
            className="rounded-md bg-violet-600 px-3 py-1 font-medium hover:bg-violet-500 disabled:opacity-40"
          >
            Fire
          </button>
        </div>
      )}
    </div>
  )
}
