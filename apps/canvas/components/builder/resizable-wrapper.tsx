'use client'

import { useRef, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useNode, useEditor } from '@craftjs/core'
import { FreeFormMoveOverlay } from '@/components/builder/free-form'
import { clampPct, getEffectiveProp, measureCanvasWidth, normalizeWidth, setEffectiveProp } from '@/lib/responsive'
import { useCanvasStore } from '@/stores/canvas-store'

interface ResizableWrapperProps {
  children?: ReactNode
  /** Passed through to the drag-root div. */
  style?: CSSProperties
  className?: string
  /** Which axes are resizable. Default: both. */
  axes?: 'both' | 'horizontal' | 'vertical'
  /** Min / max bounds for the drag handles. */
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  /** If false, skip Craft.js connect+drag binding. Useful when the inner
   *  component already wires its own drag root (widgets do) and you just
   *  want ResizableWrapper for the size style + handles. */
  bindConnectors?: boolean
}

/**
 * Wraps a block's root DOM with:
 *   - Craft.js connect + drag refs (so the existing block still works)
 *   - Selected-state outline
 *   - Live size driven by the node's `_w` / `_h` / `_mt` props (written by
 *     the right-rail SizeControls)
 *   - Corner + edge drag handles shown when the block is selected; dragging
 *     writes the new width/height straight back to the node props
 *
 * Usage (replacing a bare `connect(drag(ref))` div in a block):
 *
 *   const { connectors: { connect, drag } } = useNode()
 *   return (
 *     <ResizableWrapper>
 *       <YourBlockContent />
 *     </ResizableWrapper>
 *   )
 */
export function ResizableWrapper({
  children, style, className,
  axes = 'both',
  minWidth = 80, maxWidth = 2000,
  minHeight = 40, maxHeight = 2000,
  bindConnectors = true,
}: ResizableWrapperProps) {
  const { connectors: { connect, drag }, selected, actions, props } = useNode((n) => ({
    selected: n.events.selected,
    props: n.data.props as Record<string, unknown>,
  }))
  // In runtime (test mode, live campaign page) Craft.js is mounted with
  // `enabled={false}`. We must not render the free-form drag overlay or the
  // resize handles there — otherwise the overlay eats pointer events and
  // the user can't click Spin, and handles appear on a non-editable page.
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }))
  // Active responsive breakpoint. In the builder this follows the stage
  // toolbar's device picker; in runtime it follows viewport width. Reads
  // and writes both go through this — so when you drag in "phone" device
  // mode, the position lands in the `_mobile` override bucket and only
  // affects mobile rendering.
  const breakpoint = useCanvasStore((s) => s.currentBreakpoint)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // All layout props go through `getEffectiveProp` so mobile overrides take
  // precedence when the renderer is on the mobile breakpoint. Desktop base
  // is the fallback — no override means "same as desktop".
  const widthProp = normalizeWidth(getEffectiveProp(props, breakpoint, '_w'))
  // `_h` and `_mt` are now stored as percentages of canvas width and rendered
  // as `cqw`. This gives uniform proportional scaling across viewports (see
  // lib/responsive.ts header).
  const heightPct = (getEffectiveProp<number>(props, breakpoint, '_h') ?? 0)
  const marginTopPct = (getEffectiveProp<number>(props, breakpoint, '_mt') ?? 0)
  // Free-form positioning. When `_pos === 'absolute'`, the block detaches
  // from flow layout and lives at (_x%, _y%) inside its container (the
  // CanvasRoot, which has `container-type: inline-size`). Both axes are a
  // percentage of canvas width — horizontal as CSS `%`, vertical as `cqw`
  // so it also resolves against container width rather than page height.
  const positioning = getEffectiveProp<'flow' | 'absolute'>(props, breakpoint, '_pos') ?? 'flow'
  const xPct = clampPct(getEffectiveProp<number>(props, breakpoint, '_x') ?? 0)
  const yPct = getEffectiveProp<number>(props, breakpoint, '_y') ?? 0
  // `_z` stacks overlapping free-form blocks. 5 is the baseline so legacy
  // configs (no `_z` set) render identically. The settings panel writes
  // operator-chosen values here via the same responsive layer everything
  // else goes through.
  const zIndex = getEffectiveProp<number>(props, breakpoint, '_z') ?? 5
  const isAbsolute = positioning === 'absolute'

  const widthStyle: CSSProperties =
    widthProp === 'auto' || widthProp === '100%'
      ? { width: isAbsolute ? 'auto' : '100%' }
      : widthProp === 'fit'
        ? { width: 'fit-content' }
        : { width: widthProp }

  // Outer wrapper holds the handles (which sit at negative offsets) and the
  // selected outline. It MUST NOT clip overflow, otherwise the bottom / corner
  // handles are invisible and un-grabbable.
  //
  // `_h` is a MIN height (the settings panel labels it "Min Height"). Setting
  // it as a fixed `height` was wrong: it cropped templates whose intrinsic
  // content is taller, making height-drag feel like "chop the component".
  // Min-height semantics mean content always fits; dragging up reserves
  // floor space (useful for adding breathing room below). If a template
  // insists on being taller than the operator wants, the fix is in the
  // template (make it content-driven), not in the wrapper.
  const mergedStyle: CSSProperties = {
    ...widthStyle,
    minHeight: heightPct > 0 ? `${heightPct}cqw` : undefined,
    marginTop: isAbsolute ? 0 : (marginTopPct > 0 ? `${marginTopPct}cqw` : undefined),
    position: isAbsolute ? 'absolute' : 'relative',
    left: isAbsolute ? `${xPct}%` : undefined,
    top: isAbsolute ? `${yPct}cqw` : undefined,
    zIndex: isAbsolute ? zIndex : undefined,
    cursor: isAbsolute && selected ? 'move' : undefined,
    ...style,
  }

  // Inner container: no `overflow: hidden` — we used to clip content when the
  // operator dragged the height smaller than natural, but that just hid the
  // widget instead of resizing it, and made "shrink" feel broken. Templates
  // are responsible for their own responsive behaviour.
  const innerStyle: CSSProperties = {
    width: '100%',
    minHeight: 'inherit',
    position: 'relative',
  }

  /** Start a pointer-drag resize. `edge` picks which dimensions get updated.
   *  Both axes write back as percentages of the canvas container width so
   *  the block scales proportionally across viewports. Vertical values also
   *  use a "% of canvas width" metric (rendered as `cqw`) — see
   *  lib/responsive.ts for the rationale. No scale factor is needed: the
   *  canvas container is no longer zoomed, so pointer deltas arrive in the
   *  same pixel space as the canvas bounding rect.
   *
   *  min/max bounds (px) are pre-converted to percent against the measured
   *  canvas width so the clamp is meaningful at any viewport size. */
  const startResize = useCallback((edge: 'r' | 'b' | 'br') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const canvasW = measureCanvasWidth(el) || 1
    const startX = e.clientX
    const startY = e.clientY
    const startWPct = (rect.width / canvasW) * 100
    const startHPct = Math.max((rect.height / canvasW) * 100, heightPct || 0)
    const minWPct = (minWidth / canvasW) * 100
    const maxWPct = (maxWidth / canvasW) * 100
    const minHPct = (minHeight / canvasW) * 100
    const maxHPct = (maxHeight / canvasW) * 100

    const onMove = (ev: PointerEvent) => {
      if (edge === 'r' || edge === 'br') {
        const dxPct = ((ev.clientX - startX) / canvasW) * 100
        const nextPct = clampPct(Math.max(minWPct, Math.min(maxWPct, startWPct + dxPct)))
        actions.setProp((p: Record<string, unknown>) => {
          setEffectiveProp(p, breakpoint, '_w', `${nextPct}%`)
        })
      }
      if (edge === 'b' || edge === 'br') {
        const dyPct = ((ev.clientY - startY) / canvasW) * 100
        const nextPct = Math.max(minHPct, Math.min(maxHPct, startHPct + dyPct))
        actions.setProp((p: Record<string, unknown>) => {
          setEffectiveProp(p, breakpoint, '_h', Math.round(nextPct * 100) / 100)
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [actions, heightPct, minWidth, maxWidth, minHeight, maxHeight, breakpoint])

  return (
    <div
      ref={(ref) => {
        rootRef.current = ref
        // In free-form mode we own the pointer so blocks stay on the canvas
        // instead of being re-parented by Craft.js's tree drag. We still
        // `connect` so the node is selectable.
        if (ref) {
          if (isAbsolute) connect(ref)
          else if (bindConnectors) connect(drag(ref))
        }
      }}
      className={className}
      style={mergedStyle}
    >
      <div style={innerStyle}>{children}</div>
      {isAbsolute && enabled && <FreeFormMoveOverlay selected={selected} />}
      {enabled && selected && (
        <>
          <div
            className={`builder-selected-outline${selected ? ' active' : ''}`}
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: 'none',
              outline: '2px solid var(--builder-accent, #4f46e5)',
              outlineOffset: -1,
              borderRadius: 'inherit',
              zIndex: 20,
            }}
            aria-hidden
          />
          {(axes === 'both' || axes === 'horizontal') && (
            <div
              onPointerDown={startResize('r')}
              data-resize-handle="r"
              title="Drag to resize width"
              style={{
                position: 'absolute',
                right: -4, top: '50%', transform: 'translateY(-50%)',
                width: 8, height: 36,
                background: 'var(--builder-accent, #4f46e5)',
                borderRadius: 4,
                cursor: 'ew-resize',
                zIndex: 21,
                boxShadow: '0 0 0 2px #fff',
              }}
            />
          )}
          {(axes === 'both' || axes === 'vertical') && (
            <div
              onPointerDown={startResize('b')}
              data-resize-handle="b"
              title="Drag to resize height"
              style={{
                position: 'absolute',
                bottom: -4, left: '50%', transform: 'translateX(-50%)',
                width: 36, height: 8,
                background: 'var(--builder-accent, #4f46e5)',
                borderRadius: 4,
                cursor: 'ns-resize',
                zIndex: 21,
                boxShadow: '0 0 0 2px #fff',
              }}
            />
          )}
          {axes === 'both' && (
            <div
              onPointerDown={startResize('br')}
              data-resize-handle="br"
              title="Drag to resize"
              style={{
                position: 'absolute',
                right: -6, bottom: -6,
                width: 14, height: 14,
                background: 'var(--builder-accent, #4f46e5)',
                borderRadius: 3,
                cursor: 'nwse-resize',
                zIndex: 22,
                boxShadow: '0 0 0 2px #fff',
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
