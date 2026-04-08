'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useWizardStore } from '@/stores/wizard-store'

type CanvasMessage =
  | { type: 'CANVAS_READY' }
  | { type: 'CANVAS_SAVED'; timestamp: string }
  | { type: 'CANVAS_DIRTY' }
  | { type: 'CANVAS_BLOCK_COUNT'; count: number }

export default function Step6Frontend() {
  const store = useWizardStore()
  const [copied, setCopied] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [blockCount, setBlockCount] = useState(0)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const canvasUrl = process.env.NEXT_PUBLIC_CANVAS_URL ?? 'http://localhost:3002'
  const jwt = typeof window !== 'undefined' ? localStorage.getItem('studio_jwt') : null
  const builderUrl = store.campaignId ? `${canvasUrl}/builder/${store.campaignId}?jwt=${jwt ?? ''}` : null
  const runtimeEmbedCode = `<iframe src="${canvasUrl}/${store.slug || 'your-slug'}?token=PLAYER_SESSION_TOKEN" width="100%" style="border:none;" allow="autoplay"></iframe>`

  const sendMechanicData = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    const payload = store.mechanics.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label,
      rewards: (m.rewardDefinitions ?? []).map((r) => ({
        id: r.id,
        mechanicId: m.id,
        type: r.type,
        config: r.config ?? {},
      })),
    }))
    iframe.contentWindow.postMessage({ type: 'STUDIO_MECHANIC_DATA', mechanics: payload }, '*')
  }, [store.mechanics])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as CanvasMessage
      if (!msg?.type) return
      if (msg.type === 'CANVAS_READY') {
        setCanvasReady(true)
        sendMechanicData()
      }
      if (msg.type === 'CANVAS_SAVED') setLastSaved(msg.timestamp)
      if (msg.type === 'CANVAS_BLOCK_COUNT') setBlockCount(msg.count)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [sendMechanicData])

  useEffect(() => {
    if (canvasReady) sendMechanicData()
  }, [canvasReady, sendMechanicData])

  const requestSave = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'STUDIO_SAVE_REQUEST' }, '*')
  }, [])

  const copyEmbed = () => {
    navigator.clipboard.writeText(runtimeEmbedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Frontend — Page Builder</h2>
        <p className="text-sm text-muted-foreground">
          Design the promotion page with the drag-and-drop builder
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-accent/30 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">Canvas Builder</h3>
            {canvasReady && (
              <span className="text-[10px] rounded-full bg-emerald-500/20 text-emerald-500 px-2 py-0.5">Connected</span>
            )}
            {blockCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{blockCount} blocks</span>
            )}
            {lastSaved && (
              <span className="text-[10px] text-muted-foreground">
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={requestSave} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent">
              Save Canvas
            </button>
            {builderUrl && (
              <a href={builderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs hover:bg-accent">
                <ExternalLink className="h-3 w-3" /> Open Full
              </a>
            )}
          </div>
        </div>

        {builderUrl ? (
          <iframe
            ref={iframeRef}
            src={builderUrl}
            className="w-full border-0"
            style={{ height: '70vh', minHeight: 500 }}
            allow="clipboard-write"
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Save the campaign first to enable the page builder
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Campaign</p>
            <p className="font-medium">{store.name || 'Untitled'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="font-mono text-sm">{store.slug || 'not-set'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mechanics</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {store.mechanics.length === 0 ? (
                <span className="text-sm text-muted-foreground">None configured</span>
              ) : store.mechanics.map((m) => (
                <span key={m.id} className="rounded-full bg-accent px-2 py-0.5 text-xs">{m.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium text-sm">Iframe Embed Code (Runtime)</h3>
          <div className="relative">
            <pre className="rounded-md bg-accent/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{runtimeEmbedCode}</pre>
            <button onClick={copyEmbed} className="absolute top-2 right-2 rounded-md bg-background border border-border p-1.5 hover:bg-accent">
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
