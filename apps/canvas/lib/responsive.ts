/**
 * Responsive layout primitives.
 *
 * The canvas is a CSS container (`container-type: inline-size`). Every
 * coordinate on a node is expressed as a fraction of the canvas's actual
 * width — horizontal AND vertical — which means the whole layout stays
 * proportionally identical across any viewport, with no JS measurement,
 * no `zoom`, and no browser-specific quirks. Pure CSS does the work via
 * `cqw` (container-query width) units.
 *
 * Coordinate schema (node props, v2):
 *   - `_x`  : number — % of canvas width, 0–100
 *   - `_y`  : number — % of canvas width (rendered as `cqw`)
 *   - `_w`  : string — `"auto" | "fit" | "25%" | "N%"`
 *   - `_h`  : number — % of canvas width (min-height, rendered as `cqw`)
 *   - `_mt` : number — % of canvas width (margin-top, rendered as `cqw`)
 *   - `_pos`: "flow" | "absolute"
 *
 * Why `cqw` for vertical values: CSS `top: N%` resolves against the
 * containing block's HEIGHT, which is variable and meaningless for our
 * purposes. `cqw` always resolves against the canvas's WIDTH, so 50cqw is
 * "half the canvas wide" whether used horizontally or vertically. That
 * gives uniform proportional scaling: widen the canvas and every value
 * grows together; narrow it and they shrink together.
 *
 * Legacy data:
 *   - v0: pixels everywhere.
 *   - v1: `_x` / `_w` converted to % of width. Marked `_migrated_v1`.
 *   - v2: `_y` / `_h` / `_mt` converted from px to % of DESIGN_WIDTH.
 *         Marked `_migrated_v2`.
 * `migrateCanvasConfig` runs both migrations idempotently.
 */

/** Canvas design width in px. Percentages resolve against this on desktop. */
export const DESIGN_WIDTH = 1200

/** Breakpoint threshold. Below this, the canvas container shrinks to fit
 *  and the runtime resolves block props against the `_mobile` override. */
export const MOBILE_BREAKPOINT = 768

/** Per-breakpoint override bucket on every node. Only populated when the
 *  operator edits a block while the builder is in phone device mode.
 *  The resolver falls back to the base props when a field is missing. */
export const MOBILE_OVERRIDES_KEY = '_mobile'

export type ResponsiveBreakpoint = 'mobile' | 'desktop'

/** Layout keys common to every positionable block. The resizable wrapper +
 *  free-form overlay read/write these; the settings panel's Size section
 *  narrows its types to this subset. Non-layout props (e.g. CanvasRoot's
 *  `bgImage`) also use the override mechanism via the generic helpers
 *  below — the `_mobile` bucket is intentionally open-ended. */
export const RESPONSIVE_PROP_KEYS = ['_x', '_y', '_w', '_h', '_mt', '_pos', '_z'] as const
export type ResponsivePropKey = typeof RESPONSIVE_PROP_KEYS[number]

/** Read a prop honoring the active breakpoint. On 'mobile' we look in the
 *  `_mobile` override bucket first and fall back to the base prop when the
 *  override is missing — inheritance by default. Works for any string key:
 *  layout (`_x`, `_w`), canvas background (`bgImage`, `bgSize`), or any
 *  future per-breakpoint field a block chooses to support. */
export function getEffectiveProp<T = unknown>(
  props: Record<string, unknown>,
  breakpoint: ResponsiveBreakpoint,
  key: string,
): T | undefined {
  if (breakpoint === 'mobile') {
    const overrides = props[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
    if (overrides && overrides[key] !== undefined) return overrides[key] as T
  }
  return props[key] as T | undefined
}

/** Write a prop to the correct layer.
 *  - editingBreakpoint 'desktop' → writes to the base prop.
 *  - editingBreakpoint 'mobile'  → writes into `_mobile` override bucket.
 *  Operates on the draft object Craft.js hands into `setProp(draft => …)`. */
export function setEffectiveProp(
  draft: Record<string, unknown>,
  editingBreakpoint: ResponsiveBreakpoint,
  key: string,
  value: unknown,
): void {
  if (editingBreakpoint === 'mobile') {
    const existing = (draft[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined) ?? {}
    draft[MOBILE_OVERRIDES_KEY] = { ...existing, [key]: value }
    return
  }
  draft[key] = value
}

/** Remove a mobile override so the prop inherits from desktop again. */
export function clearMobileOverride(
  draft: Record<string, unknown>,
  key: string,
): void {
  const existing = draft[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
  if (!existing) return
  const next = { ...existing }
  delete next[key]
  // Drop the bucket entirely when empty so serialized JSON stays lean.
  if (Object.keys(next).length === 0) delete draft[MOBILE_OVERRIDES_KEY]
  else draft[MOBILE_OVERRIDES_KEY] = next
}

/** Does the node have a mobile override for this key? */
export function hasMobileOverride(
  props: Record<string, unknown>,
  key: string,
): boolean {
  const overrides = props[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
  return overrides != null && overrides[key] !== undefined
}

/** Does the node have ANY mobile override? Used by the layer tree to
 *  render a small diff indicator next to rows that deviate from desktop,
 *  so the operator can spot "this block differs on phone" without clicking
 *  into it. */
export function hasAnyMobileOverride(props: Record<string, unknown>): boolean {
  const overrides = props[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
  return overrides != null && Object.keys(overrides).length > 0
}

/** Count mobile overrides on a node. Useful for the tooltip summary
 *  ("3 mobile overrides"). */
export function countMobileOverrides(props: Record<string, unknown>): number {
  const overrides = props[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
  return overrides ? Object.keys(overrides).length : 0
}

/** Drop the entire `_mobile` bucket. Used by the "Clear all mobile
 *  overrides" action so the block inherits desktop layout wholesale.
 *  Operates on the Craft.js draft object. */
export function clearAllMobileOverrides(draft: Record<string, unknown>): void {
  if (draft[MOBILE_OVERRIDES_KEY] !== undefined) {
    delete draft[MOBILE_OVERRIDES_KEY]
  }
}

/** Parse a width value to a normalized form.
 *  - Numbers → treated as px (legacy).
 *  - Strings ending in `%` → returned as-is.
 *  - Strings ending in `px` → converted to % of DESIGN_WIDTH. */
export function normalizeWidth(value: unknown): string {
  if (typeof value === 'number') {
    return pxToPct(value)
  }
  if (typeof value !== 'string') return 'auto'
  const v = value.trim()
  if (v === '' || v === 'auto' || v === 'fit' || v.endsWith('%')) return v
  if (v.endsWith('px')) {
    const px = parseFloat(v)
    if (!Number.isFinite(px)) return 'auto'
    return pxToPct(px)
  }
  // Bare number in a string: treat as px.
  const num = Number(v)
  if (Number.isFinite(num)) return pxToPct(num)
  return v
}

/** Convert a pixel value (at DESIGN_WIDTH) to a rounded percentage string. */
export function pxToPct(px: number): string {
  const pct = (px / DESIGN_WIDTH) * 100
  return `${Math.round(pct * 100) / 100}%`
}

/** Convert a percentage (0–100) to pixels at DESIGN_WIDTH. */
export function pctToDesignPx(pct: number): number {
  return (pct / 100) * DESIGN_WIDTH
}

/** Clamp a percentage to the valid 0–100 range. */
export function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
}

/** Migration markers written on the ROOT node. Each is checked independently
 *  so running v2 on already-v1 data doesn't re-run v1, and vice versa. */
const MIGRATION_KEY_V1 = '_migrated_v1'
const MIGRATION_KEY_V2 = '_migrated_v2'

/**
 * Convert a stored px value to the v2 schema (% of DESIGN_WIDTH, rendered
 * as `cqw` at read time). Rounds to 2 decimal places for JSON compactness.
 * Returns 0 untouched (legacy default; also correct in cqw). */
function pxToCqw(px: number): number {
  if (px === 0 || !Number.isFinite(px)) return 0
  return Math.round((px / DESIGN_WIDTH) * 10000) / 100
}

/**
 * Idempotently migrate a serialized Craft.js tree to the current coordinate
 * schema. Operates on a JSON string OR a parsed object; returns a JSON
 * string (matches input format convention).
 *
 * Passes:
 *   - **v1**: convert legacy `_x` (px → %) and `_w` (`"Npx"` → `"M%"`).
 *     Skipped if `_migrated_v1` is already set on ROOT.
 *   - **v2**: convert `_y` / `_h` / `_mt` from px to % of DESIGN_WIDTH so
 *     they can render as `cqw` (see file header). Also walks any `_mobile`
 *     override buckets so mobile-specific coordinates get converted too.
 *     Skipped if `_migrated_v2` is already set on ROOT.
 */
export function migrateCanvasConfig(input: string | object | null | undefined): string | null {
  if (input == null) return null
  let tree: Record<string, { props?: Record<string, unknown> } & Record<string, unknown>>
  try {
    tree = typeof input === 'string' ? JSON.parse(input) : (input as typeof tree)
  } catch {
    return typeof input === 'string' ? input : null
  }
  if (!tree || typeof tree !== 'object') return null

  const rootNode = tree.ROOT
  const rootProps = (rootNode?.props ?? {}) as Record<string, unknown>
  const needsV1 = !rootProps[MIGRATION_KEY_V1]
  const needsV2 = !rootProps[MIGRATION_KEY_V2]
  if (!needsV1 && !needsV2) return JSON.stringify(tree)

  const convertVerticalBucket = (bag: Record<string, unknown>) => {
    for (const key of ['_y', '_h', '_mt'] as const) {
      const v = bag[key]
      if (typeof v === 'number' && v !== 0) bag[key] = pxToCqw(v)
    }
  }

  for (const nodeId of Object.keys(tree)) {
    const node = tree[nodeId]
    const props = node?.props as Record<string, unknown> | undefined
    if (!props) continue

    if (needsV1) {
      // _x: legacy px value. Anything > 0 is treated as px and converted.
      // The v1 marker prevents double-conversion on subsequent loads.
      if (typeof props._x === 'number' && props._x > 0) {
        props._x = clampPct((props._x / DESIGN_WIDTH) * 100)
      }
      // _w: string. Convert "Npx" → "M%".
      if (typeof props._w === 'string') {
        props._w = normalizeWidth(props._w)
      } else if (typeof props._w === 'number') {
        props._w = pxToPct(props._w)
      }
    }

    if (needsV2) {
      // Convert vertical/spacing props on the base layer, then walk the
      // mobile override bucket with the same rules so phone-specific
      // overrides migrate in lockstep.
      convertVerticalBucket(props)
      const mobile = props[MOBILE_OVERRIDES_KEY] as Record<string, unknown> | undefined
      if (mobile) convertVerticalBucket(mobile)
    }
  }

  if (rootNode) {
    const rp = (rootNode.props ??= {}) as Record<string, unknown>
    if (needsV1) rp[MIGRATION_KEY_V1] = true
    if (needsV2) rp[MIGRATION_KEY_V2] = true
  }
  return JSON.stringify(tree)
}

/**
 * Build a CSS `clamp()` expression for fluid font sizes (or any other
 * length) that scales smoothly between viewport widths. `minPx` kicks in
 * at the narrowest viewport, `maxPx` at the widest, with a linear ramp
 * through the middle sized so the target growth happens across a 1200px
 * → 400px span (our DESIGN_WIDTH → a reasonable small-phone width).
 *
 * Usage:
 *   <h1 style={{ fontSize: fluidSize(20, 40) }}>Title</h1>
 *
 * Prefer `clamp()` over per-breakpoint overrides for text — it avoids the
 * operator having to tune every label twice. Use the `_mobile` override
 * for blocks where the design genuinely differs (position, layout).
 */
export function fluidSize(minPx: number, maxPx: number): string {
  const minRem = minPx / 16
  const maxRem = maxPx / 16
  // Scale rate: (maxPx - minPx) / (DESIGN_WIDTH - small) vw per viewport-px.
  // Using a 400px small baseline gives a gentle ramp readable at phone
  // widths without blowing up on ultrawide displays.
  const vwRate = ((maxPx - minPx) / (DESIGN_WIDTH - 400)) * 100
  const baseRem = (minPx - (vwRate / 100) * 400) / 16
  return `clamp(${minRem.toFixed(3)}rem, ${baseRem.toFixed(3)}rem + ${vwRate.toFixed(2)}vw, ${maxRem.toFixed(3)}rem)`
}

/** Data attribute that marks the canvas container element. Used by
 *  `measureCanvasWidth` to locate the correct ancestor — walking up for
 *  "the first positioned ancestor" is unreliable because a free-form block
 *  is itself `position: absolute` and would return its own width. */
export const CANVAS_ROOT_ATTR = 'data-canvas-root'

/** Compute the effective pixel width of the canvas container that hosts a
 *  block's percentage-based coordinates. Uses `closest([data-canvas-root])`
 *  so we skip past the block's own positioned wrapper and land on the
 *  actual container (CanvasRoot in the builder, `.canvas-runtime-container`
 *  in runtime). Falls back to DESIGN_WIDTH if the attribute is missing. */
export function measureCanvasWidth(el: HTMLElement | null): number {
  if (!el) return DESIGN_WIDTH
  // `closest` walks up INCLUDING the element itself, so start from the
  // parent to avoid matching a block that happens to carry the attribute.
  const host = el.parentElement?.closest<HTMLElement>(`[${CANVAS_ROOT_ATTR}]`)
  if (host) return host.getBoundingClientRect().width || DESIGN_WIDTH
  return DESIGN_WIDTH
}

