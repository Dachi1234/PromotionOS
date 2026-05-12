export type CanvasMessage =
  | { type: 'CANVAS_READY' }
  | { type: 'CANVAS_SAVED'; timestamp: string }
  | { type: 'CANVAS_DIRTY' }
  | { type: 'CANVAS_BLOCK_COUNT'; count: number }
  | { type: 'CANVAS_HEIGHT'; height: number }
  | { type: 'CANVAS_AUTH_REQUEST' }
  | { type: 'CANVAS_NAVIGATE'; action: string; data?: unknown }

export interface StudioMechanicReward {
  id: string
  mechanicId: string
  type: string
  config: Record<string, unknown>
  /** Optional compound condition paired with this reward (e.g. wager-gate
   *  to unlock a bonus). Mirrors `BuilderMechanicReward.conditionConfig`
   *  so the studio can push it through without extra mapping. */
  conditionConfig?: {
    condition_type?: string
    target_value?: number
    time_limit_hours?: number
    label?: string
  } | null
}

export interface StudioMechanicPayload {
  id: string
  type: string
  label: string
  /** Mechanic-level config (spin limits, triggers, etc.). The builder
   *  doesn't render this directly yet but stores it so widgets can read
   *  trigger rules without re-fetching. */
  config?: Record<string, unknown>
  rewards: StudioMechanicReward[]
}

export type StudioMessage =
  | { type: 'STUDIO_CAMPAIGN_UPDATED' }
  | { type: 'STUDIO_THEME_SUGGESTION'; theme: Record<string, unknown> }
  | { type: 'STUDIO_SAVE_REQUEST' }
  | { type: 'STUDIO_MECHANIC_DATA'; mechanics: StudioMechanicPayload[] }
  | { type: 'PARENT_SESSION_TOKEN'; token: string }
  | { type: 'PARENT_LANGUAGE'; lang: string }

export function sendToParent(message: CanvasMessage) {
  if (typeof window === 'undefined') return
  try {
    window.parent.postMessage(message, '*')
  } catch { /* not in iframe */ }
}

export function listenForParentMessages(handler: (msg: StudioMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    if (event.data?.type && typeof event.data.type === 'string') {
      handler(event.data as StudioMessage)
    }
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
