'use client'

/**
 * useSessionStream — the canvas's realtime channel.
 *
 * Replaces `refetchInterval` polling in `use-canvas-data.ts`. One long-lived
 * SSE connection per (slug, session token) invalidates the relevant React
 * Query cache keys as server-side state changes.
 *
 * Event types (mirror `RealtimeEvent` in the engine):
 *   - connected               — handshake; we drop this on the floor.
 *   - player-state-updated    — player's stats / progress / rewards changed.
 *                               Invalidates `player-state`, `player-rewards`,
 *                               and all `mission-state` keys (cheap — React
 *                               Query skips refetch for unmounted queries).
 *   - leaderboard-changed     — ranking moved for `mechanicId`. Targets only
 *                               that leaderboard query.
 *   - reward-granted          — reward-executor committed a reward. Same
 *                               invalidation fan-out as player-state-updated
 *                               (the reward is already in player_rewards by
 *                               the time this fires), with an opportunity to
 *                               trigger a toast via the `onRewardGranted`
 *                               callback.
 *   - mechanic-state-updated  — reserved for future per-mechanic state
 *                               (mission step transitions without stat
 *                               changes). Currently piggybacks on player-
 *                               state-updated path.
 *
 * Silent failure modes:
 *   - Engine lacks Redis: the SSE endpoint returns 503 once and EventSource
 *     keeps retrying. The existing React Query fetches keep working via
 *     `refetchOnWindowFocus` + mutation invalidations. The canvas still
 *     functions, just without push updates.
 *   - Network drop / laptop sleep: EventSource auto-reconnects on the `retry:`
 *     directive (5s). No manual retry logic needed here.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCanvasStore } from '@/stores/canvas-store'
import { ENGINE_URL } from '@/lib/api-client'

export interface RewardGrantedPayload {
  type: 'reward-granted'
  rewardType: string
  amount?: number
  mechanicId?: string
  playerRewardId?: string
}

export interface UseSessionStreamOptions {
  /** Called once per `reward-granted` event — hook up a toast or sound here. */
  onRewardGranted?: (payload: RewardGrantedPayload) => void
}

export function useSessionStream(
  slug: string | null,
  opts: UseSessionStreamOptions = {},
): void {
  const token = useCanvasStore((s) => s.sessionToken)
  const qc = useQueryClient()
  const isAdminPreview = token === '__admin_preview__'
  // Keep the latest callback ref in a ref so the effect below can stay
  // dependency-stable (otherwise every re-render reopens the SSE connection).
  const onRewardGrantedRef = useRef(opts.onRewardGranted)
  onRewardGrantedRef.current = opts.onRewardGranted

  useEffect(() => {
    if (!slug || !token || isAdminPreview) return
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const url =
      `${ENGINE_URL}/api/v1/stream?slug=${encodeURIComponent(slug)}` +
      `&token=${encodeURIComponent(token)}`

    const es = new EventSource(url)

    const invalidatePlayerScope = (): void => {
      qc.invalidateQueries({ queryKey: ['player-state', slug] })
      qc.invalidateQueries({ queryKey: ['player-rewards', slug] })
      // All mission-state queries (keyed by mechanicId) — refreshes only
      // the currently-mounted ones.
      qc.invalidateQueries({ queryKey: ['mission-state'] })
    }

    es.addEventListener('player-state-updated', invalidatePlayerScope)

    es.addEventListener('leaderboard-changed', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { mechanicId?: string }
        if (data.mechanicId) {
          qc.invalidateQueries({ queryKey: ['leaderboard', data.mechanicId] })
        } else {
          qc.invalidateQueries({ queryKey: ['leaderboard'] })
        }
      } catch {
        qc.invalidateQueries({ queryKey: ['leaderboard'] })
      }
    })

    es.addEventListener('mechanic-state-updated', invalidatePlayerScope)

    es.addEventListener('reward-granted', (e) => {
      invalidatePlayerScope()
      try {
        const data = JSON.parse((e as MessageEvent).data) as RewardGrantedPayload
        onRewardGrantedRef.current?.(data)
      } catch {
        /* malformed payload — still invalidated, that's enough */
      }
    })

    // EventSource auto-reconnects; don't close on transient errors.
    es.onerror = () => {
      // readyState === 2 means closed permanently. `new EventSource` if we
      // want to force-reopen — but the browser retries via `retry:` already.
    }

    return () => {
      es.close()
    }
  }, [slug, token, isAdminPreview, qc])
}
