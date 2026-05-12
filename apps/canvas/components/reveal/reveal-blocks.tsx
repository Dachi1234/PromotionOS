'use client'

import { useNode, type UserComponent, Element } from '@craftjs/core'
import { useRevealData } from './reveal-data-context'
import type { ReactNode } from 'react'

/**
 * Craft.js blocks for the custom reveal canvas.
 *
 * The reveal is its OWN Craft.js editor instance (see `reveal-editor.tsx`)
 * scoped to just these blocks. The operator opens it via the "Edit reveal"
 * button on the wheel widget, drags these onto the canvas, positions them
 * freely, and saves. The serialized tree is stored as `revealCanvasJson`
 * on the wheel widget's Craft.js node.
 *
 * Positioning: each block lives inside `RevealCanvas` (position: relative)
 * and uses percentage offsets (`_x`, `_y`) so the same layout scales with
 * the reveal's responsive size. We read/write those props directly instead
 * of reusing the main canvas's `withFreeForm` — the reveal's coordinate
 * system is its OWN width, not the main canvas's.
 */

// ────────────────────────────────────────────────────────────────────────
// Absolute-positioning wrapper shared by every reveal block. Handles:
//   - reading `_x`, `_y`, `_z` as percentages of the reveal container
//   - dragging the block with the pointer to update those props
//   - selection outline when the block is selected in the editor
// Runtime (`enabled=false`) short-circuits the drag logic so live player
// views never activate move overlays.
// ────────────────────────────────────────────────────────────────────────
function PositionedBlock({
  children,
  defaultX = 10,
  defaultY = 10,
}: { children: ReactNode; defaultX?: number; defaultY?: number }) {
  const { connectors: { connect, drag }, actions, props, selected } = useNode((n) => ({
    props: n.data.props as { _x?: number; _y?: number; _z?: number; _w?: number },
    selected: n.events.selected,
  }))
  const x = props._x ?? defaultX
  const y = props._y ?? defaultY
  const z = props._z ?? 5
  const width = props._w

  const onPointerDown = (e: React.PointerEvent) => {
    // Only handle primary button drags. Let inner buttons / inputs win
    // their clicks via `data-reveal-interactive` on ancestors.
    if (e.button !== 0) return
    const sx = e.clientX
    const sy = e.clientY
    const startX = x
    const startY = y
    // Measure the parent reveal canvas so drags translate 1:1 in %.
    const parent = (e.currentTarget as HTMLElement).offsetParent as HTMLElement | null
    const rect = parent?.getBoundingClientRect()
    const canvasW = rect?.width || 1
    const canvasH = rect?.height || 1
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
      moved = true
      const nx = Math.max(0, Math.min(100, startX + (dx / canvasW) * 100))
      const ny = Math.max(0, Math.min(100, startY + (dy / canvasH) * 100))
      actions.setProp((p: { _x?: number; _y?: number }) => {
        p._x = Math.round(nx * 100) / 100
        p._y = Math.round(ny * 100) / 100
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        zIndex: z,
        width: width ? `${width}%` : 'auto',
        cursor: 'move',
        outline: selected ? '2px solid #3b82f6' : 'none',
        outlineOffset: 2,
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RevealCanvas — root container of the custom reveal. Holds the bg image
// and a free-form drop zone on top. Gets added as the Root node when the
// editor initializes with a fresh reveal.
// ────────────────────────────────────────────────────────────────────────
interface RevealCanvasProps {
  bgImage: string
  /** Fixed width of the reveal (px). The canvas scales to the image's
   *  natural aspect ratio so what you see in the editor matches runtime. */
  width: number
  /** Override for the aspect ratio when no bgImage is set. */
  aspectRatio: string
  bgColor: string
  children?: ReactNode
}

export const RevealCanvas: UserComponent<RevealCanvasProps> = ({ bgImage, width, aspectRatio, bgColor, children }) => {
  const { connectors: { connect } } = useNode()
  return (
    <div
      ref={(ref) => { if (ref) connect(ref) }}
      style={{
        position: 'relative',
        width,
        maxWidth: '90vw',
        aspectRatio: bgImage ? undefined : aspectRatio,
        background: bgColor,
        overflow: 'hidden',
        borderRadius: 16,
        boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6)',
      }}
    >
      {bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bgImage}
          alt=""
          draggable={false}
          style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
        />
      )}
      {children}
    </div>
  )
}

RevealCanvas.craft = {
  displayName: 'Reveal Canvas',
  props: { bgImage: '', width: 480, aspectRatio: '4 / 5', bgColor: '#1a1a2e' },
  // Root canvas — accepts children (the free-form blocks).
  rules: { canDrag: () => false, canMoveIn: () => true, canMoveOut: () => true },
  isCanvas: true,
  related: { settings: RevealCanvasSettings },
}

function RevealCanvasSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RevealCanvasProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Background image URL</label>
      <input
        type="text"
        value={props.bgImage}
        onChange={(e) => setProp((p: RevealCanvasProps) => { p.bgImage = e.target.value })}
        placeholder="Paste an uploaded image URL"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <p className="text-[10px] leading-tight text-gray-500">
        Upload via the wheel widget&apos;s Prize Reveal section, then paste the URL here. The canvas sizes to the image&apos;s natural aspect ratio.
      </p>
      <label className="block text-xs font-medium">Width (px)</label>
      <input
        type="number"
        min={240}
        max={1200}
        value={props.width}
        onChange={(e) => setProp((p: RevealCanvasProps) => { p.width = Number(e.target.value) || 480 })}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <label className="block text-xs font-medium">Background color</label>
      <input
        type="color"
        value={props.bgColor || '#1a1a2e'}
        onChange={(e) => setProp((p: RevealCanvasProps) => { p.bgColor = e.target.value })}
        className="h-8 w-full"
      />
      <label className="block text-xs font-medium">Aspect ratio (when no image)</label>
      <input
        type="text"
        value={props.aspectRatio}
        onChange={(e) => setProp((p: RevealCanvasProps) => { p.aspectRatio = e.target.value })}
        placeholder="4 / 5"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Shared position/appearance settings — used by every free-form block.
// ────────────────────────────────────────────────────────────────────────
function PositionSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({
    props: n.data.props as { _x?: number; _y?: number; _z?: number; _w?: number },
  }))
  return (
    <div className="space-y-2 rounded bg-gray-50 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Position</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px]">X %</label>
          <input
            type="number" min={0} max={100} step={0.1}
            value={props._x ?? 0}
            onChange={(e) => setProp((p: { _x?: number }) => { p._x = Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px]">Y %</label>
          <input
            type="number" min={0} max={100} step={0.1}
            value={props._y ?? 0}
            onChange={(e) => setProp((p: { _y?: number }) => { p._y = Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px]">Width %</label>
          <input
            type="number" min={0} max={100} step={0.5}
            value={props._w ?? 0}
            onChange={(e) => setProp((p: { _w?: number }) => { p._w = Number(e.target.value) || undefined })}
            className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
            title="0 = auto"
          />
        </div>
        <div>
          <label className="block text-[10px]">Z-index</label>
          <input
            type="number" min={0} max={99}
            value={props._z ?? 5}
            onChange={(e) => setProp((p: { _z?: number }) => { p._z = Number(e.target.value) })}
            className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
          />
        </div>
      </div>
      <p className="text-[10px] leading-tight text-gray-500">
        Drag the block in the canvas to move it, or fine-tune here.
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RevealText — static text. Operator types whatever they want.
// ────────────────────────────────────────────────────────────────────────
interface RevealTextProps {
  content: string
  fontSize: number
  fontWeight: number
  color: string
  align: 'left' | 'center' | 'right'
  letterSpacing: number
  textShadow: boolean
  _x?: number; _y?: number; _z?: number; _w?: number
}

export const RevealText: UserComponent<RevealTextProps> = ({ content, fontSize, fontWeight, color, align, letterSpacing, textShadow }) => {
  return (
    <PositionedBlock>
      <div
        style={{
          fontSize, fontWeight, color, textAlign: align,
          letterSpacing: `${letterSpacing}em`,
          textShadow: textShadow ? '0 2px 12px rgba(0,0,0,0.85)' : 'none',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.25,
        }}
      >
        {content || 'Your text'}
      </div>
    </PositionedBlock>
  )
}

RevealText.craft = {
  displayName: 'Text',
  props: { content: 'Your text', fontSize: 24, fontWeight: 800, color: '#ffffff', align: 'center', letterSpacing: 0, textShadow: true, _x: 10, _y: 10, _z: 5 },
  related: { settings: RevealTextSettings },
}

function RevealTextSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RevealTextProps }))
  return (
    <div className="space-y-2 p-3">
      <label className="block text-xs font-medium">Text</label>
      <textarea
        value={props.content}
        onChange={(e) => setProp((p: RevealTextProps) => { p.content = e.target.value })}
        rows={3}
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px]">Font size</label>
          <input type="number" value={props.fontSize} onChange={(e) => setProp((p: RevealTextProps) => { p.fontSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-[10px]">Weight</label>
          <input type="number" value={props.fontWeight} step={100} onChange={(e) => setProp((p: RevealTextProps) => { p.fontWeight = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
      </div>
      <label className="block text-xs">Color</label>
      <input type="color" value={props.color} onChange={(e) => setProp((p: RevealTextProps) => { p.color = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs">Align</label>
      <select value={props.align} onChange={(e) => setProp((p: RevealTextProps) => { p.align = e.target.value as RevealTextProps['align'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs">
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={props.textShadow} onChange={(e) => setProp((p: RevealTextProps) => { p.textShadow = e.target.checked })} />
        <span>Text shadow (for readability over images)</span>
      </label>
      <PositionSettings />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RevealRewardLabel — placeholder for the won reward's label. Renders live
// data at runtime via `useRevealData`.
// ────────────────────────────────────────────────────────────────────────
interface RevealRewardLabelProps extends Omit<RevealTextProps, 'content'> {}

export const RevealRewardLabel: UserComponent<RevealRewardLabelProps> = (props) => {
  const { payload } = useRevealData()
  const content = payload.rewardAmount != null && payload.rewardAmount !== ''
    ? String(payload.rewardAmount)
    : payload.rewardLabel
  return <RevealText {...(props as RevealTextProps)} content={content} />
}

RevealRewardLabel.craft = {
  displayName: 'Reward label (live)',
  props: { fontSize: 32, fontWeight: 900, color: '#ffffff', align: 'center', letterSpacing: 0, textShadow: true, _x: 10, _y: 35, _z: 6 },
  related: { settings: () => (
    <div className="p-3 space-y-2">
      <div className="rounded bg-blue-50 p-2 text-[10px] text-blue-800">
        Shows the operator-authored reward label (e.g. &ldquo;$10 Cash&rdquo;). Style it like any text.
      </div>
      <RevealTextSettings />
    </div>
  ) },
}

// ────────────────────────────────────────────────────────────────────────
// RevealConditionLabel — live condition string (e.g. "Deposit $20 in 24h").
// ────────────────────────────────────────────────────────────────────────
export const RevealConditionLabel: UserComponent<RevealRewardLabelProps> = (props) => {
  const { payload } = useRevealData()
  if (!payload.conditionLabel) return null
  return <RevealText {...(props as RevealTextProps)} content={payload.conditionLabel} />
}

RevealConditionLabel.craft = {
  displayName: 'Condition (live)',
  props: { fontSize: 16, fontWeight: 600, color: '#ffffff', align: 'center', letterSpacing: 0, textShadow: true, _x: 10, _y: 55, _z: 6 },
  related: { settings: RevealTextSettings },
}

// ────────────────────────────────────────────────────────────────────────
// RevealProgressBar — condition progress. Renders "current / target"
// and a fill bar. For now shows 0/target (stub) — live tracking hooks
// into engine progress endpoint in the next pass.
// ────────────────────────────────────────────────────────────────────────
interface RevealProgressBarProps {
  label: string
  barColor: string
  trackColor: string
  textColor: string
  fontSize: number
  /** Manual target override when payload.conditionLabel lacks a number.
   *  `0` → try to read from condition metadata (future). */
  target: number
  /** Force a preview value in edit mode so the operator sees the bar full. */
  previewCurrent: number
  _x?: number; _y?: number; _z?: number; _w?: number
}

export const RevealProgressBar: UserComponent<RevealProgressBarProps> = ({ label, barColor, trackColor, textColor, fontSize, target, previewCurrent }) => {
  const { previewMode } = useRevealData()
  // TODO(progress): wire live `useConditionProgress(playerRewardId)` once
  // the engine endpoint lands. Until then, preview shows authored target,
  // runtime shows 0 (player just won, no progress yet).
  const current = previewMode ? previewCurrent : 0
  const tgt = target > 0 ? target : 20
  const pct = Math.max(0, Math.min(100, (current / tgt) * 100))
  return (
    <PositionedBlock defaultX={10} defaultY={75}>
      <div style={{ color: textColor, fontSize, fontWeight: 700, width: '100%' }}>
        {label && (
          <div style={{ marginBottom: 6, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: fontSize * 0.7 }}>
            {label}
          </div>
        )}
        <div style={{
          position: 'relative',
          background: trackColor,
          borderRadius: 999,
          height: fontSize * 1.4,
          overflow: 'hidden',
          border: `1px solid ${barColor}44`,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            width: `${pct}%`,
            background: barColor,
            transition: 'width 400ms ease',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: textColor, fontWeight: 800,
          }}>
            {current} / {tgt}
          </div>
        </div>
      </div>
    </PositionedBlock>
  )
}

RevealProgressBar.craft = {
  displayName: 'Progress bar',
  props: {
    label: 'Your progress',
    barColor: '#2FDF6E',
    trackColor: '#1a1a2e',
    textColor: '#ffffff',
    fontSize: 14,
    target: 20,
    previewCurrent: 13,
    _x: 10, _y: 75, _w: 80, _z: 6,
  },
  related: { settings: RevealProgressBarSettings },
}

function RevealProgressBarSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RevealProgressBarProps }))
  return (
    <div className="space-y-2 p-3">
      <div className="rounded bg-amber-50 p-2 text-[10px] text-amber-900">
        Shows progress toward the reward&apos;s condition. Runtime starts at <strong>0</strong> (player just won); live tracking endpoint lands in the next release.
      </div>
      <label className="block text-xs font-medium">Label</label>
      <input value={props.label} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.label = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px]">Target</label>
          <input type="number" value={props.target} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.target = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-[10px]">Preview value</label>
          <input type="number" value={props.previewCurrent} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.previewCurrent = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
      </div>
      <label className="block text-xs">Bar color</label>
      <input type="color" value={props.barColor} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.barColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs">Track color</label>
      <input type="color" value={props.trackColor} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.trackColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs">Text color</label>
      <input type="color" value={props.textColor} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs">Font size</label>
      <input type="number" value={props.fontSize} onChange={(e) => setProp((p: RevealProgressBarProps) => { p.fontSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
      <PositionSettings />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RevealCtaButton — close-the-reveal CTA. Style fully editable.
// ────────────────────────────────────────────────────────────────────────
interface RevealCtaButtonProps {
  label: string
  bgColor: string
  textColor: string
  fontSize: number
  paddingX: number
  paddingY: number
  radius: number
  _x?: number; _y?: number; _z?: number; _w?: number
}

export const RevealCtaButton: UserComponent<RevealCtaButtonProps> = ({ label, bgColor, textColor, fontSize, paddingX, paddingY, radius }) => {
  const { onClose, defaults } = useRevealData()
  return (
    <PositionedBlock defaultX={10} defaultY={88}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        style={{
          background: bgColor,
          color: textColor,
          fontSize,
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          padding: `${paddingY}px ${paddingX}px`,
          borderRadius: radius,
          border: 'none',
          cursor: 'pointer',
          boxShadow: `0 6px 20px -4px ${bgColor}88`,
          width: '100%',
        }}
      >
        {label || defaults.ctaLabel}
      </button>
    </PositionedBlock>
  )
}

RevealCtaButton.craft = {
  displayName: 'CTA button',
  props: { label: 'Continue', bgColor: '#2FDF6E', textColor: '#0A2A14', fontSize: 14, paddingX: 28, paddingY: 14, radius: 999, _x: 10, _y: 88, _w: 80, _z: 7 },
  related: { settings: RevealCtaButtonSettings },
}

function RevealCtaButtonSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RevealCtaButtonProps }))
  return (
    <div className="space-y-2 p-3">
      <label className="block text-xs">Label</label>
      <input value={props.label} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.label = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px]">Background</label>
          <input type="color" value={props.bgColor} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
        </div>
        <div>
          <label className="block text-[10px]">Text</label>
          <input type="color" value={props.textColor} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px]">Font</label>
          <input type="number" value={props.fontSize} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.fontSize = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-[10px]">Radius</label>
          <input type="number" value={props.radius} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.radius = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-[10px]">Pad X</label>
          <input type="number" value={props.paddingX} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.paddingX = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block text-[10px]">Pad Y</label>
          <input type="number" value={props.paddingY} onChange={(e) => setProp((p: RevealCtaButtonProps) => { p.paddingY = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
      </div>
      <PositionSettings />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// RevealImage — decorative floating image (e.g. a trophy, a logo, a
// sticker) layered on top of the bg. Natural size by default.
// ────────────────────────────────────────────────────────────────────────
interface RevealImageProps {
  src: string
  width: number
  _x?: number; _y?: number; _z?: number; _w?: number
}

export const RevealImage: UserComponent<RevealImageProps> = ({ src, width }) => {
  return (
    <PositionedBlock>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} style={{ width, height: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
      ) : (
        <div style={{ width, height: width * 0.6, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.3)', color: '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Paste an image URL
        </div>
      )}
    </PositionedBlock>
  )
}

RevealImage.craft = {
  displayName: 'Image',
  props: { src: '', width: 160, _x: 20, _y: 15, _z: 5 },
  related: { settings: RevealImageSettings },
}

function RevealImageSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RevealImageProps }))
  return (
    <div className="space-y-2 p-3">
      <label className="block text-xs">Image URL</label>
      <input value={props.src} onChange={(e) => setProp((p: RevealImageProps) => { p.src = e.target.value })} placeholder="Paste an uploaded image URL" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
      <label className="block text-xs">Width (px)</label>
      <input type="number" value={props.width} onChange={(e) => setProp((p: RevealImageProps) => { p.width = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
      <PositionSettings />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Element helper — used by the editor to seed a fresh reveal with a
// RevealCanvas root that accepts drops.
// ────────────────────────────────────────────────────────────────────────
export function DefaultRevealFrame({ bgImage }: { bgImage?: string }) {
  return (
    <Element is={RevealCanvas} canvas bgImage={bgImage ?? ''} width={480} aspectRatio="4 / 5" bgColor="#1a1a2e" />
  )
}

// ────────────────────────────────────────────────────────────────────────
// Reveal resolver — used by both the editor and the runtime <Frame>.
// ────────────────────────────────────────────────────────────────────────
export const revealResolver = {
  RevealCanvas,
  RevealText,
  RevealRewardLabel,
  RevealConditionLabel,
  RevealProgressBar,
  RevealCtaButton,
  RevealImage,
}
