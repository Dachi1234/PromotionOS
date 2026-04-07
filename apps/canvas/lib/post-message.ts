export type CanvasMessage =
  | { type: 'CANVAS_READY' }
  | { type: 'CANVAS_SAVED'; timestamp: string }
  | { type: 'CANVAS_DIRTY' }
  | { type: 'CANVAS_BLOCK_COUNT'; count: number }
  | { type: 'CANVAS_HEIGHT'; height: number }
  | { type: 'CANVAS_AUTH_REQUEST' }
  | { type: 'CANVAS_NAVIGATE'; action: string; data?: unknown }

export type StudioMessage =
  | { type: 'STUDIO_CAMPAIGN_UPDATED' }
  | { type: 'STUDIO_THEME_SUGGESTION'; theme: Record<string, unknown> }
  | { type: 'STUDIO_SAVE_REQUEST' }
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
