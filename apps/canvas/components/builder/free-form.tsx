'use client'

import { createElement, useCallback, useRef, type ComponentType, type ReactNode } from 'react'
import { useNode, useEditor } from '@craftjs/core'
import { clampPct, getEffectiveProp, measureCanvasWidth, setEffectiveProp } from '@/lib/responsive'
import { useCanvasStore } from '@/stores/canvas-store'

/**
 * Shared free-form positioning layer.
 *
 * Every placeable block/widget reads three optional props from its Craft.js
 * node: `_pos` ('flow' | 'absolute'), `_x`, `_y`. When `_pos === 'absolute'`
 * the block detaches from flow layout and lives at (_x, _y) inside its
 * relative-positioned parent (the CanvasRoot). A transparent overlay on top
 * intercepts pointer drags to update x/y, while sub-threshold clicks fall
 * through to Craft.js's `connect` so node selection still works.
 *
 * `ResizableWrapper` implements this inline for widgets. This helper is for
 * everything else — blocks that don't use ResizableWrapper get wrapped with
 * `withFreeForm` in the resolver so the same contract applies.
 */

const MOVE_THRESHOLD = 3 // px — anything below this is a click, not a drag

interface FreeFormProps {
  _pos?: 'flow' | 'absolute'
  _x?: number
  _y?: number
}

/** Transparent overlay that owns pointer drags for a free-form block.
 *  Sits on top of the block in the z-stack so inner drag connectors
 *  (e.g. Craft.js's tree-drag on widget internals) don't win the race. */
export function FreeFormMoveOverlay({ selected }: { selected: boolean }) {
  const { actions, props } = useNode((n) => ({ props: n.data.props as Record<string, unknown> }))
  // Runtime uses `<Editor enabled={false}>`. The overlay must not mount
  // there — it sits at z-index 15 across the whole block and would swallow
  // clicks meant for the Spin button / mechanic widgets.
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }))
  // Reads + writes go through the active breakpoint so mobile drags produce
  // a mobile-only override (never shifts the desktop layer).
  const breakpoint = useCanvasStore((s) => s.currentBreakpoint)
  const startXPct = getEffectiveProp<number>(props, breakpoint, '_x') ?? 0
  const startYPct = getEffectiveProp<number>(props, breakpoint, '_y') ?? 0
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Skip drags that start on a resize handle or something else that
    // wants the pointer.
    const target = e.target as HTMLElement
    if (target.dataset?.resizeHandle) return
    const sx = e.clientX
    const sy = e.clientY
    // Measure the canvas width ONCE at pointer-down so fast drags don't
    // jitter from per-frame re-measurement. Both `_x` and `_y` are stored
    // as percentages of the canvas container width (`_y` renders as `cqw`),
    // so the same ratio math works for both axes.
    const canvasW = measureCanvasWidth(overlayRef.current) || 1
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx
      const dy = ev.clientY - sy
      if (!moved && Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return
      moved = true
      const nextXPct = clampPct(startXPct + (dx / canvasW) * 100)
      const nextYPct = Math.max(0, Math.round((startYPct + (dy / canvasW) * 100) * 100) / 100)
      actions.setProp((p: Record<string, unknown>) => {
        setEffectiveProp(p, breakpoint, '_x', nextXPct)
        setEffectiveProp(p, breakpoint, '_y', nextYPct)
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // No stopPropagation / preventDefault: a pure click (no move) must be
    // allowed to bubble to the Craft.js connector so selection still works.
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [actions, startXPct, startYPct, breakpoint])

  if (!enabled) return null

  return (
    <div
      ref={overlayRef}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', inset: 0,
        cursor: selected ? 'move' : 'grab',
        zIndex: 15,
        background: 'transparent',
      }}
      aria-label="Drag to move"
    />
  )
}

/**
 * Higher-order wrapper for blocks that render their own root div (i.e. don't
 * use ResizableWrapper). Reads free-form props from the node and positions
 * the block absolutely when enabled. Preserves the inner component's
 * `.craft` config so Craft.js's drag-and-drop, settings panel, and defaults
 * all keep working.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withFreeForm<P extends object>(Inner: ComponentType<P> & { craft?: any }, displayName?: string): ComponentType<P> & { craft?: any } {
  const Wrapped = (props: P): ReactNode => {
    const nodeProps = useNode((n) => ({
      raw: n.data.props as Record<string, unknown>,
      selected: n.events.selected,
    }))
    const breakpoint = useCanvasStore((s) => s.currentBreakpoint)
    const pos = getEffectiveProp<'flow' | 'absolute'>(nodeProps.raw, breakpoint, '_pos') ?? 'flow'
    const x = clampPct(getEffectiveProp<number>(nodeProps.raw, breakpoint, '_x') ?? 0)
    const y = getEffectiveProp<number>(nodeProps.raw, breakpoint, '_y') ?? 0
    // `_z` lets operators stack overlapping free-form blocks in a
    // predictable order. Omitted → falls back to the baseline 5 so
    // existing canvases keep rendering identically.
    const z = getEffectiveProp<number>(nodeProps.raw, breakpoint, '_z') ?? 5
    const selected = nodeProps.selected

    if (pos !== 'absolute') {
      return createElement(Inner, props)
    }
    return (
      <div
        style={{
          position: 'absolute',
          // Both axes resolve against the canvas container's inline size
          // (see lib/responsive.ts). Horizontal uses CSS `%`; vertical uses
          // `cqw` so "10" means the same proportional distance on either
          // axis and the layout stays uniform across viewports.
          left: `${x}%`,
          top: `${y}cqw`,
          zIndex: z,
          // `fit-content` keeps the shell sized to its child so the overlay
          // covers exactly the block. Blocks that want a fixed width can
          // still set `_w` via ResizableWrapper — if they use ResizableWrapper
          // they wouldn't be wrapped by this HOC.
          width: 'fit-content',
          height: 'fit-content',
        }}
      >
        {createElement(Inner, props)}
        <FreeFormMoveOverlay selected={selected} />
      </div>
    )
  }
  Wrapped.displayName = `FreeForm(${displayName ?? Inner.displayName ?? Inner.name ?? 'Block'})`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyInner = Inner as any
  if (anyInner.craft) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Wrapped as any).craft = anyInner.craft
  }
  return Wrapped as ComponentType<P> & { craft?: unknown }
}
