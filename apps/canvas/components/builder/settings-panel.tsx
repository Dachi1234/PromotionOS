'use client'

import { useEditor } from '@craftjs/core'
import React from 'react'
import { Trash2, Copy, Move, RotateCcw } from 'lucide-react'
import {
  clampPct, normalizeWidth,
  getEffectiveProp, setEffectiveProp, clearMobileOverride, hasMobileOverride,
  hasAnyMobileOverride, countMobileOverrides, clearAllMobileOverrides,
  type ResponsivePropKey,
} from '@/lib/responsive'
import { useCanvasStore } from '@/stores/canvas-store'

/**
 * Right rail.
 *
 * When a block is selected we show its block-specific settings (via
 * `node.related.settings`) plus a standard top strip with:
 *   - node display name
 *   - duplicate / delete actions (ROOT is protected)
 *   - width / height / margin sliders that write into the node's
 *     `custom.size` props. Blocks that opt-in to `<ResizableWrapper>`
 *     (see components/builder/resizable-wrapper.tsx) read these back.
 *
 * When nothing is selected we fall back to the global theme panel.
 */
export function SettingsPanel({ globalThemePanel }: { globalThemePanel: React.ReactNode }) {
  const { actions, query, selected, relatedSettings, displayName, isRoot, parentId, parentIndex, mobileOverrideCount } = useEditor((state) => {
    const currentNodeId = state.events.selected.values().next().value
    if (!currentNodeId) {
      return { selected: null, relatedSettings: undefined, displayName: '', isRoot: false, parentId: null as string | null, parentIndex: 0, mobileOverrideCount: 0 }
    }
    const node = state.nodes[currentNodeId]
    const parent = node?.data?.parent ?? null
    // Insert duplicates immediately after the original so ordering stays
    // predictable. Craft.js indexes are 0-based; we hand it `idx + 1`.
    const siblings = parent ? state.nodes[parent]?.data?.nodes ?? [] : []
    const idx = siblings.indexOf(currentNodeId)
    const props = (node?.data?.props ?? {}) as Record<string, unknown>
    return {
      selected: currentNodeId,
      relatedSettings: node?.related?.settings,
      displayName: node?.data?.displayName ?? node?.data?.name ?? 'Block',
      isRoot: currentNodeId === 'ROOT' || node?.data?.parent == null,
      parentId: parent,
      parentIndex: idx >= 0 ? idx + 1 : siblings.length,
      mobileOverrideCount: countMobileOverrides(props),
    }
  })

  /** Duplicate the selected node by serialising it + descendants into a
   *  node tree and re-adding it next to its original. Uses
   *  `toNodeTree() + addNodeTree()` which is the Craft.js-native way to
   *  clone nested structures without losing nested node parenting. */
  const duplicateSelected = React.useCallback(() => {
    if (!selected || !parentId) return
    try {
      const tree = query.node(selected).toNodeTree()
      actions.addNodeTree(tree, parentId, parentIndex)
    } catch {
      /* Node couldn't be cloned (e.g. non-canvas parent rejected the
         insert). Surface nothing — the user can retry. */
    }
  }, [selected, parentId, parentIndex, query, actions])

  return (
    <aside className="builder-rightrail">
      {selected && !isRoot ? (
        <>
          <div className="builder-rightrail-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div className="builder-rightrail-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{displayName}</span>
                {/* Diff badge — shows at a glance that this block deviates
                    from the desktop layout on mobile. Single source of
                    truth for "this block has mobile overrides" so the
                    operator doesn't have to flip device modes to discover
                    unexpected differences. */}
                {mobileOverrideCount > 0 && (
                  <span
                    title={`${mobileOverrideCount} mobile override${mobileOverrideCount === 1 ? '' : 's'} on this block`}
                    style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                      padding: '1px 5px', borderRadius: 3,
                      background: 'var(--builder-accent, #4f46e5)', color: '#fff',
                    }}
                  >
                    +{mobileOverrideCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="builder-btn-icon"
                  title="Duplicate (Ctrl+D)"
                  onClick={duplicateSelected}
                  disabled={!parentId}
                  aria-disabled={!parentId}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="builder-btn-icon"
                  title="Delete (Del)"
                  onClick={() => { try { actions.delete(selected) } catch { /* noop */ } }}
                  style={{ color: 'var(--builder-danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
          <SizeControls />
          {relatedSettings && React.createElement(relatedSettings)}
        </>
      ) : isRoot && relatedSettings ? (
        // ROOT selected — CanvasRoot owns the page background. Show its
        // settings (bg type / color / gradient / image / overlay). The global
        // theme panel is still available below so theme swaps stay one click
        // away without hiding the more immediate canvas-bg controls.
        <>
          <div className="builder-rightrail-header">
            <div className="builder-rightrail-title">Canvas Background</div>
          </div>
          {React.createElement(relatedSettings)}
          <div className="builder-rightrail-header" style={{ borderTop: '1px solid var(--builder-line)' }}>
            <div className="builder-rightrail-title">Global Theme</div>
          </div>
          {globalThemePanel}
        </>
      ) : (
        <>
          <div className="builder-rightrail-header">
            <div className="builder-rightrail-title">Global Theme</div>
          </div>
          {globalThemePanel}
        </>
      )}
    </aside>
  )
}

/**
 * Generic size controls. Writes into the node's props as `_w`, `_h`, `_mt`
 * (width, height, margin-top). Any block that wants to respect them wraps
 * its return in `<ResizableWrapper {...props}>`. Blocks without the wrapper
 * ignore these — the controls still appear (harmless) to keep a single
 * predictable settings shape.
 */
function SizeControls() {
  const { actions, nodeId, props } = useEditor((state) => {
    const id = state.events.selected.values().next().value as string
    return { nodeId: id, props: (state.nodes[id]?.data?.props ?? {}) as Record<string, unknown> }
  })
  // Active breakpoint: reads + writes target this layer. When 'mobile' the
  // panel edits the `_mobile` override bucket; when 'desktop' it edits the
  // base props directly.
  const breakpoint = useCanvasStore((s) => s.currentBreakpoint)
  const isMobile = breakpoint === 'mobile'

  /** Write a layout prop to the correct layer (mobile override vs. base). */
  const set = (key: ResponsivePropKey, val: unknown) => {
    actions.setProp(nodeId, (p: Record<string, unknown>) => {
      setEffectiveProp(p, breakpoint, key, val)
    })
  }
  /** Drop the mobile override for `key` so it re-inherits from desktop. */
  const reset = (key: ResponsivePropKey) => {
    actions.setProp(nodeId, (p: Record<string, unknown>) => {
      clearMobileOverride(p, key)
    })
  }
  const overridden = (key: ResponsivePropKey) => isMobile && hasMobileOverride(props, key)

  // All reads honor the active breakpoint — overrides when editing mobile,
  // base values otherwise. Display matches what the operator sees on the
  // stage so dragging handles and panel inputs stay in sync.
  const w = normalizeWidth(getEffectiveProp(props, breakpoint, '_w'))
  const h = getEffectiveProp<number>(props, breakpoint, '_h') ?? 0
  const mt = getEffectiveProp<number>(props, breakpoint, '_mt') ?? 0
  const pos = getEffectiveProp<'flow' | 'absolute'>(props, breakpoint, '_pos') ?? 'flow'
  const x = clampPct(getEffectiveProp<number>(props, breakpoint, '_x') ?? 0)
  const y = getEffectiveProp<number>(props, breakpoint, '_y') ?? 0
  const z = getEffectiveProp<number>(props, breakpoint, '_z') ?? 5

  /** Reset chip shown next to a label when this prop has a mobile override.
   *  Gives the operator a one-click way to undo a mobile tweak and re-lock
   *  to the desktop value. */
  const ResetChip = ({ for_ }: { for_: ResponsivePropKey }) =>
    overridden(for_) ? (
      <button
        type="button"
        onClick={() => reset(for_)}
        title="Reset to desktop value"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          marginLeft: 6, padding: '1px 5px', fontSize: 10,
          background: 'var(--builder-accent, #4f46e5)', color: '#fff',
          border: 0, borderRadius: 3, cursor: 'pointer',
        }}
      >
        <RotateCcw size={10} /> reset
      </button>
    ) : null

  const input: React.CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: 12,
    border: '1px solid var(--builder-line-2)', borderRadius: 6, background: 'var(--builder-surface)',
    color: 'var(--builder-ink)', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: 14, borderBottom: '1px solid var(--builder-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--builder-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Move size={12} /> Size</span>
        {/* Tells the operator which layer edits will land in. Tied to the
            stage-toolbar device picker — switching to phone puts the panel
            into "mobile override" mode; anything else edits the base. */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              padding: '2px 6px', borderRadius: 3,
              background: isMobile ? 'var(--builder-accent, #4f46e5)' : 'var(--builder-line)',
              color: isMobile ? '#fff' : 'var(--builder-muted)',
            }}
            title={isMobile
              ? 'Changes here only affect the mobile layout. Desktop stays untouched.'
              : 'Changes here affect the base layout (used by desktop and inherited by mobile unless overridden).'}
          >
            {isMobile ? 'MOBILE' : 'DESKTOP'}
          </span>
          {/* Clear-all mobile overrides — only surfaced while editing mobile
              AND the node actually has overrides to drop. One click unsticks
              the block back to pure desktop inheritance (the entire
              `_mobile` bucket is removed, keeping serialized JSON clean). */}
          {isMobile && hasAnyMobileOverride(props) && (
            <button
              type="button"
              onClick={() => {
                actions.setProp(nodeId, (p: Record<string, unknown>) => {
                  clearAllMobileOverrides(p)
                })
              }}
              title={`Reset all ${countMobileOverrides(props)} mobile override${countMobileOverrides(props) === 1 ? '' : 's'} on this block`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', fontSize: 9, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                background: 'transparent', color: 'var(--builder-muted)',
                border: '1px solid var(--builder-line-2)', borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={9} /> reset all
            </button>
          )}
        </span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--builder-muted)', marginBottom: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={pos === 'absolute'}
          onChange={(e) => set('_pos', e.target.checked ? 'absolute' : 'flow')}
        />
        Free position (drag anywhere on canvas)
      </label>
      {pos === 'absolute' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <div>
            {/* X is a percentage of canvas width so the block stays
                proportionally placed across viewports. When editing mobile
                this writes to `_mobile._x`; the ResetChip appears to drop
                the override and fall back to desktop. */}
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
              X · {x}%<ResetChip for_="_x" />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={x}
              onChange={(e) => set('_x', clampPct(Number(e.target.value)))}
              style={input}
            />
          </div>
          <div>
            {/* Y is also expressed as % of canvas WIDTH (rendered as cqw) so
                it stays in proportion with X — see lib/responsive.ts. */}
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
              Y · {y}%<ResetChip for_="_y" />
            </label>
            <input type="number" min={0} step={0.5} value={y} onChange={(e) => set('_y', Math.max(0, Number(e.target.value)))} style={input} />
          </div>
        </div>
      )}
      {pos === 'absolute' && (
        /* Layer (z-index) controls. Only relevant when free-form is on —
           flow children stack in document order and `_z` would do nothing.
           Convenience buttons write canonical values so operators don't
           have to guess; typing into the numeric input gives precise
           control when two blocks need to sit between those stops. */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, alignItems: 'end', marginBottom: 10 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
              Layer · {z}<ResetChip for_="_z" />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={z}
              onChange={(e) => set('_z', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              style={input}
            />
          </div>
          <button
            type="button"
            onClick={() => set('_z', 1)}
            title="Send to back"
            style={{ padding: '6px 8px', fontSize: 11, background: 'var(--builder-surface)', color: 'var(--builder-muted)', border: '1px solid var(--builder-line-2)', borderRadius: 6, cursor: 'pointer' }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => set('_z', 50)}
            title="Bring to front"
            style={{ padding: '6px 8px', fontSize: 11, background: 'var(--builder-surface)', color: 'var(--builder-muted)', border: '1px solid var(--builder-line-2)', borderRadius: 6, cursor: 'pointer' }}
          >
            Front
          </button>
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
        Width<ResetChip for_="_w" />
      </label>
      <select
        value={w.endsWith('%') && !['25%', '50%', '75%', '100%'].includes(w) ? 'custom' : w}
        onChange={(e) => {
          if (e.target.value === 'custom') return // handled by the nudge input
          set('_w', e.target.value)
        }}
        style={{ ...input, marginBottom: w.endsWith('%') ? 6 : 10 }}
      >
        <option value="auto">Auto (100%)</option>
        <option value="25%">25%</option>
        <option value="50%">50%</option>
        <option value="75%">75%</option>
        <option value="100%">100%</option>
        <option value="fit">Fit content</option>
        {w.endsWith('%') && !['25%', '50%', '75%', '100%'].includes(w) && (
          <option value="custom">Custom · {w}</option>
        )}
      </select>
      {/* Nudge input for free-form widths written by the resize handles.
          Keeps the preset dropdown tidy while still surfacing the current
          precise value for keyboard editing. */}
      {w.endsWith('%') && (
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={parseFloat(w)}
          onChange={(e) => set('_w', `${clampPct(Number(e.target.value))}%`)}
          style={{ ...input, marginBottom: 10 }}
          title="Width % of canvas"
        />
      )}
      {/* Height + spacing sliders emit % of canvas width (same unit as X/Y).
          At desktop widths this maps ~1% = 12px; at phone widths it
          contracts proportionally so layouts stay consistent. */}
      <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
        Min Height · {h || 'auto'}{h ? '%' : ''}<ResetChip for_="_h" />
      </label>
      <input type="range" min={0} max={100} step={0.5} value={h} onChange={(e) => set('_h', Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
      <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--builder-muted)', marginBottom: 4 }}>
        Spacing above · {mt}%<ResetChip for_="_mt" />
      </label>
      <input type="range" min={0} max={30} step={0.25} value={mt} onChange={(e) => set('_mt', Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  )
}
