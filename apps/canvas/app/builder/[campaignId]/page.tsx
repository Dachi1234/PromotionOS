'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
import { StageToolbar, type DeviceMode } from '@/components/builder/stage-toolbar'
import { DeviceFrame } from '@/components/builder/device-frame'
import { KeyboardShortcuts } from '@/components/builder/keyboard-shortcuts'
import { ThemeApplier } from '@/components/runtime/theme-applier'
import { DEFAULT_PRESETS, getPreset, type DeviceType } from '@/lib/device-presets'
import { CanvasRoot } from '@/components/blocks/canvas-root'
import { Providers } from '@/app/providers'
import { migrateCanvasConfig } from '@/lib/responsive'

function EditorCapture({ editorRef }: { editorRef: React.MutableRefObject<{ serialize: () => string } | null> }) {
  const { query } = useEditor()
  useEffect(() => {
    editorRef.current = { serialize: () => query.serialize() }
  }, [query, editorRef])
  return null
}

/** Lifts Craft.js node count out of <Editor> so the stage-toolbar can show
 *  a live "N blocks" meter without itself consuming the editor context. */
function NodeCountCapture({ onChange }: { onChange: (n: number) => void }) {
  const { count } = useEditor((state) => ({ count: Object.keys(state.nodes).length }))
  useEffect(() => { onChange(count) }, [count, onChange])
  return null
}

/** Secondary-device placeholder used in `both` mode.
 *
 *  Craft.js can only mount ONE <Frame> per <Editor>. In side-by-side mode
 *  we mount the real frame in the primary device (phone) and render this
 *  read-only companion inside the secondary device (desktop) so operators
 *  still see both form factors. The companion shows a compact summary of
 *  what's on the canvas — enough to verify layout intent — and prompts the
 *  operator to switch device modes for pixel-level editing at that width.
 */
function StaticPreview({ initialState }: { initialState: string | null }) {
  const blockCount = useMemo(() => {
    if (!initialState) return 0
    try {
      const parsed = JSON.parse(initialState) as Record<string, unknown>
      return Math.max(0, Object.keys(parsed).length - 1) // minus ROOT
    } catch {
      return 0
    }
  }, [initialState])

  return (
    <div
      style={{
        padding: '48px 32px',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
        color: 'var(--builder-muted)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.4 }}>⧉</div>
      <div style={{ color: 'var(--builder-ink)', fontWeight: 600, fontSize: 14 }}>
        Live preview
      </div>
      <div style={{ maxWidth: 280 }}>
        {blockCount} block{blockCount === 1 ? '' : 's'} on canvas.
        Switch device mode to edit at this width.
      </div>
    </div>
  )
}

function BuilderInner() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { setBuilder, setCampaignId } = useCanvasStore()
  const [campaignName, setCampaignName] = useState('')
  const [mechanics, setMechanics] = useState<{ id: string; type: string; label: string; config?: Record<string, unknown> }[]>([])
  const [initialState, setInitialState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [jwt, setJwt] = useState<string | null>(null)
  // Device + zoom state — lifted out of the toolbar so the stage-toolbar
  // and the multi-device canvas can share it. Operators pick both a device
  // type (phone / tablet / desktop / both) and a specific model preset
  // (iPhone 15 Pro, iPad, 1440 desktop, etc.).
  const [device, setDevice] = useState<DeviceMode>('phone')
  // Mirror the device picker onto the canvas store's `currentBreakpoint` so
  // block renderers + the settings panel know which layer to show/write.
  // phone → mobile; tablet/desktop/both → desktop. Tablet inherits desktop
  // in the 2-breakpoint schema; we'll broaden this if Phase 3 needs it.
  const { setCurrentBreakpoint } = useCanvasStore()
  useEffect(() => {
    setCurrentBreakpoint(device === 'phone' ? 'mobile' : 'desktop')
  }, [device, setCurrentBreakpoint])
  const [phonePresetId, setPhonePresetId] = useState<string>(DEFAULT_PRESETS.phone.id)
  const [tabletPresetId, setTabletPresetId] = useState<string>(DEFAULT_PRESETS.tablet.id)
  const [desktopPresetId, setDesktopPresetId] = useState<string>(DEFAULT_PRESETS.desktop.id)
  const [zoom, setZoom] = useState<number>(100)
  const [blockCount, setBlockCount] = useState<number>(0)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<{ serialize: () => string } | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Holds the latest serialized editor state. When the Frame unmounts (e.g.
  // on device switch) and remounts, the remounted Frame reads this ref to
  // re-hydrate its tree instead of losing everything to `initialState`
  // (which is stale from first load).
  const latestJsonRef = useRef<string | null>(null)

  const phonePreset = getPreset(phonePresetId) ?? DEFAULT_PRESETS.phone
  const tabletPreset = getPreset(tabletPresetId) ?? DEFAULT_PRESETS.tablet
  const desktopPreset = getPreset(desktopPresetId) ?? DEFAULT_PRESETS.desktop

  const setPresetId = useCallback((type: DeviceType, id: string) => {
    if (type === 'phone') setPhonePresetId(id)
    else if (type === 'tablet') setTabletPresetId(id)
    else setDesktopPresetId(id)
  }, [])

  /** Compute the widest device frame currently on stage, then set zoom so
   *  it exactly fits the available stage width. Used by the Fit-to-stage
   *  button and called automatically when switching to desktop (since
   *  desktops are usually wider than the stage). */
  const handleFit = useCallback(() => {
    const stageEl = stageRef.current
    if (!stageEl) return
    const available = stageEl.clientWidth - 48 // 24px padding each side
    let widest = 0
    if (device === 'phone' || device === 'both') widest = Math.max(widest, phonePreset.width + 32)
    if (device === 'tablet') widest = Math.max(widest, tabletPreset.width + 40)
    if (device === 'desktop' || device === 'both') widest = Math.max(widest, desktopPreset.width + 2)
    if (device === 'both') widest = phonePreset.width + 32 + 32 + desktopPreset.width + 2
    if (widest === 0) return
    const next = Math.max(25, Math.min(100, Math.floor((available / widest) * 100)))
    setZoom(next)
  }, [device, phonePreset, tabletPreset, desktopPreset])

  // Auto-fit when device OR preset changes — keeps large desktops visible
  // without requiring a manual zoom out.
  useEffect(() => {
    const id = setTimeout(handleFit, 50)
    return () => clearTimeout(id)
  }, [device, phonePresetId, tabletPresetId, desktopPresetId, handleFit])

  // Keep legacy --canvas-width CSS variable in sync for any inner code
  // still reading it (e.g. older templates with responsive breakpoints).
  useEffect(() => {
    const w =
      device === 'phone' ? phonePreset.width :
      device === 'tablet' ? tabletPreset.width :
      device === 'desktop' ? desktopPreset.width :
      phonePreset.width
    document.documentElement.style.setProperty('--canvas-width', `${w}px`)
  }, [device, phonePreset, tabletPreset, desktopPreset])

  useEffect(() => {
    setBuilder(true)
    setCampaignId(campaignId)

    const params = new URLSearchParams(window.location.search)
    const token = params.get('jwt') ?? localStorage.getItem('studio_jwt')
    if (token) {
      // Persist whatever token we booted with so background admin calls
      // (upload helper, future ad-hoc fetches) can pick it up without
      // needing to be handed it through React state. Studio passes the
      // JWT via URL on iframe open; without this write, `localStorage`
      // stays empty and uploads fail with "Not authenticated".
      localStorage.setItem('studio_jwt', token)
      setJwt(token)
      loadCampaignData(token)
    } else {
      setLoading(false)
    }

    const cleanup = listenForParentMessages((msg) => {
      if (msg.type === 'STUDIO_SAVE_REQUEST') {
        triggerSave()
      }
      if (msg.type === 'STUDIO_MECHANIC_DATA') {
        // Studio hands us well-typed payloads; map straight into the
        // builder store shape without the historical `Record<string, unknown>`
        // cast that was erasing all field types and breaking typecheck.
        setBuilderMechanics(msg.mechanics.map((m) => ({
          id: m.id,
          type: m.type,
          label: m.label,
          config: m.config ?? {},
          rewards: (m.rewards ?? []).map((r) => ({
            id: r.id,
            mechanicId: r.mechanicId,
            type: r.type,
            config: r.config ?? {},
            conditionConfig: r.conditionConfig ?? null,
          })),
        })))
      }
    })

    sendToParent({ type: 'CANVAS_READY' })
    return cleanup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const { setBuilderMechanics } = useCanvasStore()

  const loadCampaignData = async (token: string) => {
    try {
      const [configData, mechanicsData, rewardsData] = await Promise.all([
        adminApi<{ canvasConfig: unknown }>(`/api/v1/admin/campaigns/${campaignId}/canvas-config`, token),
        adminApi<{ mechanics: { id: string; type: string; label: string; config?: Record<string, unknown> }[] }>(`/api/v1/admin/campaigns/${campaignId}/mechanics`, token),
        adminApi<{ rewardDefinitions: { id: string; mechanicId: string; type: string; config: Record<string, unknown>; conditionConfig?: Record<string, unknown> | null }[] }>(`/api/v1/admin/campaigns/${campaignId}/reward-definitions`, token),
      ])
      if (configData.canvasConfig) {
        // Migrate legacy pixel coordinates to percentage-based ones so the
        // layout scales across viewports. Idempotent — a marker on ROOT
        // prevents double conversion.
        const migrated = migrateCanvasConfig(configData.canvasConfig)
        if (migrated) setInitialState(migrated)
      }
      const mechList = mechanicsData.mechanics ?? []
      setMechanics(mechList)

      const rewardDefs = rewardsData.rewardDefinitions ?? []
      const rewardsByMechanic = new Map<string, typeof rewardDefs>()
      for (const r of rewardDefs) {
        const list = rewardsByMechanic.get(r.mechanicId) ?? []
        list.push(r)
        rewardsByMechanic.set(r.mechanicId, list)
      }
      setBuilderMechanics(mechList.map((m) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        config: (m.config as Record<string, unknown>) ?? {},
        rewards: (rewardsByMechanic.get(m.id) ?? []).map((r) => ({
          id: r.id,
          mechanicId: r.mechanicId,
          type: r.type,
          config: r.config ?? {},
          // Carry the gate through — used by the wheel widget's
          // "Inner wedge → Condition" preview and by the runtime reveal.
          // Engine returns this on every reward row, Studio ships it
          // already attached; the only reason it was ever missing was
          // this loader dropping it on the floor.
          conditionConfig: (r.conditionConfig ?? null) as import('@/stores/canvas-store').BuilderMechanicReward['conditionConfig'],
        })),
      })))

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
    // Keep the snapshot fresh on every edit so device switches don't wipe state.
    if (editorRef.current) {
      try { latestJsonRef.current = editorRef.current.serialize() } catch { /* noop */ }
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    sendToParent({ type: 'CANVAS_DIRTY' })
    saveTimerRef.current = setTimeout(() => triggerSave(), 15000)
  }, [triggerSave])

  // Seed the snapshot with the initially loaded state so the very first
  // device switch (before any edit) also rehydrates correctly.
  useEffect(() => {
    if (initialState && !latestJsonRef.current) latestJsonRef.current = initialState
  }, [initialState])

  if (loading) {
    return (
      <div className="builder-shell h-screen flex items-center justify-center">
        <div className="animate-pulse" style={{ color: 'var(--builder-muted)' }}>Loading builder…</div>
      </div>
    )
  }

  return (
    <div className="builder-shell h-screen flex flex-col">
      {/* Mount once — writes `data-theme` on <html> so [data-theme=…] rules
          in globals.css (and the `luxe` templates that read CSS vars) pick
          up the active campaign theme. */}
      <ThemeApplier />
      <Editor
        resolver={resolver}
        onNodesChange={scheduleAutoSave}
      >
        <EditorCapture editorRef={editorRef} />
        <NodeCountCapture onChange={setBlockCount} />
        <KeyboardShortcuts />
        <BuilderToolbar campaignName={campaignName} onSave={triggerSave} saveStatus={saveStatus} saveError={saveError} />
        {saveError && (
          <div
            className="flex items-center justify-between px-4 py-2 text-xs"
            style={{
              background: 'oklch(0.95 0.08 25)',
              borderBottom: '1px solid oklch(0.85 0.12 25)',
              color: 'oklch(0.38 0.20 25)',
            }}
          >
            <span>Save error: {saveError}</span>
            <button onClick={() => setSaveError(null)} className="underline">Dismiss</button>
          </div>
        )}
        <div className="builder-body">
          <BlockLibrary />
          <main className="builder-stage">
            <StageToolbar
              device={device}
              setDevice={setDevice}
              phonePresetId={phonePresetId}
              tabletPresetId={tabletPresetId}
              desktopPresetId={desktopPresetId}
              setPresetId={setPresetId}
              zoom={zoom}
              setZoom={setZoom}
              onFit={handleFit}
              blockCount={blockCount}
            />
            <div ref={stageRef} className="builder-stage-canvas">
              {/*
               * Using CSS `zoom` (not transform: scale) so the scaled
               * content's layout size also scales — the outer scrollbar
               * then correctly reflects how big the zoomed canvas is, and
               * wide desktops at 100% zoom become horizontally scrollable
               * instead of getting clipped.
               *
               * `zoom` is supported in Chromium, Safari and Firefox 126+.
               */}
              <div style={{ zoom: zoom / 100, display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                {/*
                 * Craft.js binds its editor state to a SINGLE <Frame>. Rendering
                 * the Frame twice in `both` mode would create two independent
                 * editors and drag-drop would break. Instead the Frame always
                 * renders once inside a phone-width device frame; for `both`
                 * and `desktop` we re-render the same canvas HTML visually by
                 * letting the inner content fluidly expand to the device
                 * width. Operators still get a real side-by-side preview of
                 * how the same promo looks at different widths.
                 */}
                {(device === 'phone' || device === 'both') && (
                  <DeviceFrame preset={phonePreset}>
                    {(device === 'phone') ? (
                      <Frame data={latestJsonRef.current ?? initialState ?? undefined}>
                        <Element is={CanvasRoot} canvas />
                      </Frame>
                    ) : (
                      <StaticPreview initialState={latestJsonRef.current ?? initialState} />
                    )}
                  </DeviceFrame>
                )}
                {device === 'tablet' && (
                  <DeviceFrame preset={tabletPreset}>
                    <Frame data={latestJsonRef.current ?? initialState ?? undefined}>
                      <Element is={CanvasRoot} canvas />
                    </Frame>
                  </DeviceFrame>
                )}
                {(device === 'desktop' || device === 'both') && (
                  <DeviceFrame preset={desktopPreset}>
                    {device === 'desktop' ? (
                      <Frame data={latestJsonRef.current ?? initialState ?? undefined}>
                        <Element is={CanvasRoot} canvas />
                      </Frame>
                    ) : (
                      <StaticPreview initialState={latestJsonRef.current ?? initialState} />
                    )}
                  </DeviceFrame>
                )}
              </div>
            </div>
          </main>
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
