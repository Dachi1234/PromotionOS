'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Editor, Frame, Element, useEditor } from '@craftjs/core'
import { useParams } from 'next/navigation'
import { resolver } from '@/lib/resolver'
import { adminApi } from '@/lib/api-client'
import { sendToParent, listenForParentMessages } from '@/lib/post-message'
import { useCanvasStore } from '@/stores/canvas-store'
import { BlockLibrary } from '@/components/builder/block-library'
import { SettingsPanel } from '@/components/builder/settings-panel'
import { GlobalThemePanel } from '@/components/builder/global-theme-panel'
import { BuilderToolbar } from '@/components/builder/builder-toolbar'
import { CanvasRoot } from '@/components/blocks/canvas-root'
import { Providers } from '@/app/providers'

function EditorCapture({ editorRef }: { editorRef: React.MutableRefObject<{ serialize: () => string } | null> }) {
  const { query } = useEditor()
  useEffect(() => {
    editorRef.current = { serialize: () => query.serialize() }
  }, [query, editorRef])
  return null
}

function BuilderInner() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { setBuilder, setCampaignId } = useCanvasStore()
  const [campaignName, setCampaignName] = useState('')
  const [mechanics, setMechanics] = useState<{ id: string; type: string; label: string }[]>([])
  const [initialState, setInitialState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [jwt, setJwt] = useState<string | null>(null)
  const editorRef = useRef<{ serialize: () => string } | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setBuilder(true)
    setCampaignId(campaignId)

    const params = new URLSearchParams(window.location.search)
    const token = params.get('jwt') ?? localStorage.getItem('studio_jwt')
    if (token) {
      setJwt(token)
      loadCampaignData(token)
    } else {
      setLoading(false)
    }

    const cleanup = listenForParentMessages((msg) => {
      if (msg.type === 'STUDIO_SAVE_REQUEST') {
        triggerSave()
      }
    })

    sendToParent({ type: 'CANVAS_READY' })
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const loadCampaignData = async (token: string) => {
    try {
      const [configData, mechanicsData] = await Promise.all([
        adminApi<{ canvasConfig: unknown }>(`/api/v1/admin/campaigns/${campaignId}/canvas-config`, token),
        adminApi<{ mechanics: { id: string; type: string; label: string }[] }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`, token),
      ])
      if (configData.canvasConfig) {
        setInitialState(typeof configData.canvasConfig === 'string' ? configData.canvasConfig : JSON.stringify(configData.canvasConfig))
      }
      setMechanics(mechanicsData.mechanics ?? [])
      const campaignResp = await adminApi<{ campaign: { name: string } }>(`/api/v1/admin/campaigns/${campaignId}`, token)
      setCampaignName(campaignResp.campaign?.name ?? '')
    } catch { /* defaults */ }
    setLoading(false)
  }

  const [saveError, setSaveError] = useState<string | null>(null)

  const triggerSave = useCallback(async () => {
    const currentJwt = jwt ?? localStorage.getItem('studio_jwt')
    if (!currentJwt || !editorRef.current) {
      setSaveError('No authentication token. Please reopen the builder from Studio.')
      return
    }
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const serialized = editorRef.current.serialize()
      await adminApi(`/api/v1/admin/campaigns/${campaignId}/canvas-config`, currentJwt, {
        method: 'PUT',
        body: JSON.stringify({ canvasConfig: serialized }),
      })
      setSaveStatus('saved')
      sendToParent({ type: 'CANVAS_SAVED', timestamp: new Date().toISOString() })
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setSaveStatus('error')
      const msg = err instanceof Error ? err.message : 'Save failed'
      setSaveError(msg)
      console.error('[Canvas] Save failed:', msg)
    }
  }, [jwt, campaignId])

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    sendToParent({ type: 'CANVAS_DIRTY' })
    saveTimerRef.current = setTimeout(() => triggerSave(), 15000)
  }, [triggerSave])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-pulse">Loading builder...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Editor
        resolver={resolver}
        onNodesChange={scheduleAutoSave}
      >
        <EditorCapture editorRef={editorRef} />
        <BuilderToolbar campaignName={campaignName} onSave={triggerSave} saveStatus={saveStatus} saveError={saveError} />
        {saveError && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400 flex items-center justify-between">
            <span>Save error: {saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-300 text-xs underline">Dismiss</button>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <BlockLibrary />
          <div className="flex-1 overflow-auto bg-gray-800 flex items-start justify-center p-8">
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden" style={{ width: 'var(--canvas-width, 375px)', minHeight: '600px' }}>
              <Frame data={initialState ?? undefined}>
                <Element is={CanvasRoot} canvas />
              </Frame>
            </div>
          </div>
          <SettingsPanel globalThemePanel={<GlobalThemePanel />} />
        </div>
      </Editor>
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Providers>
      <BuilderInner />
    </Providers>
  )
}
