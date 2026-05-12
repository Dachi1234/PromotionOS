'use client'

import { Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, Settings, Maximize2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas-store'
import { THEMES } from '@/lib/themes'
import { presetsFor, type DeviceType } from '@/lib/device-presets'

export type DeviceMode = 'both' | 'phone' | 'desktop' | 'tablet'

interface StageToolbarProps {
  device: DeviceMode
  setDevice: (d: DeviceMode) => void
  /** Per-type selected preset id (phone/tablet/desktop model). */
  phonePresetId: string
  tabletPresetId: string
  desktopPresetId: string
  setPresetId: (type: DeviceType, id: string) => void
  zoom: number
  setZoom: (z: number | ((prev: number) => number)) => void
  onFit?: () => void
  blockCount: number
  onOpenTweaks?: () => void
}

/** Stage toolbar — lives immediately above the canvas. Device segmented on
 *  the left + per-device model dropdown. Meta strip in the middle. Zoom
 *  control + Fit-to-stage on the right. */
export function StageToolbar({
  device, setDevice,
  phonePresetId, tabletPresetId, desktopPresetId, setPresetId,
  zoom, setZoom, onFit,
  blockCount, onOpenTweaks,
}: StageToolbarProps) {
  const { themeId } = useCanvasStore()
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]

  const segBtn = (key: DeviceMode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setDevice(key)}
      className={device === key ? 'active' : ''}
      title={label}
    >
      {icon} {label}
    </button>
  )

  // Pick which preset dropdown to show. In `both` mode we don't show a
  // dropdown here — both phone AND desktop pickers appear below instead.
  const activePicker: DeviceType | null =
    device === 'phone' ? 'phone' :
    device === 'tablet' ? 'tablet' :
    device === 'desktop' ? 'desktop' : null

  const presetIdFor = (t: DeviceType) =>
    t === 'phone' ? phonePresetId : t === 'tablet' ? tabletPresetId : desktopPresetId

  const renderPicker = (t: DeviceType) => {
    const current = presetIdFor(t)
    return (
      <select
        key={`picker-${t}`}
        value={current}
        onChange={(e) => {
          const next = e.target.value
          // Log + set. If the dropdown appeared stuck in a previous build,
          // confirming via devtools that this fires tells us the UI state
          // is updating correctly and the difference may just be visual
          // (some phone presets differ by only ~20px of width).
          // eslint-disable-next-line no-console
          console.log('[stage-toolbar] setPresetId', t, next)
          setPresetId(t, next)
        }}
        className="builder-device-picker"
        title={`${t} model`}
      >
        {presetsFor(t).map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} — {p.width}×{p.height}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="builder-stage-toolbar">
      <div className="builder-segmented">
        {segBtn('both', <Monitor size={13} />, 'Both')}
        {segBtn('phone', <Smartphone size={13} />, 'Phone')}
        {segBtn('tablet', <Tablet size={13} />, 'Tablet')}
        {segBtn('desktop', <Monitor size={13} />, 'Desktop')}
      </div>

      {activePicker && renderPicker(activePicker)}

      {device === 'both' && (
        <>
          {renderPicker('phone')}
          {renderPicker('desktop')}
        </>
      )}

      <div className="spacer" />

      <div className="builder-stage-meta">
        <strong>{blockCount}</strong> {blockCount === 1 ? 'block' : 'blocks'} · Theme:{' '}
        <strong>{theme.label}</strong>
      </div>

      {onFit && (
        <button type="button" className="builder-btn-icon" onClick={onFit} title="Fit to stage">
          <Maximize2 size={13} />
        </button>
      )}

      <div className="builder-zoom-ctl">
        <button type="button" onClick={() => setZoom((z) => Math.max(25, z - 10))} title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <div className="builder-zoom-ctl-val">{zoom}%</div>
        <button type="button" onClick={() => setZoom((z) => Math.min(200, z + 10))} title="Zoom in">
          <ZoomIn size={13} />
        </button>
      </div>

      {onOpenTweaks && (
        <button type="button" className="builder-btn-icon" onClick={onOpenTweaks} title="Canvas tweaks">
          <Settings size={14} />
        </button>
      )}
    </div>
  )
}
