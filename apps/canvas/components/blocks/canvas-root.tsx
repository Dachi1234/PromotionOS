'use client'

import type { ReactNode, CSSProperties, ChangeEvent } from 'react'
import { useRef } from 'react'
import { useNode, useEditor, type UserComponent } from '@craftjs/core'
import {
  CANVAS_ROOT_ATTR,
  clearMobileOverride,
  getEffectiveProp,
  hasMobileOverride,
  setEffectiveProp,
} from '@/lib/responsive'
import { useCanvasStore } from '@/stores/canvas-store'
import { RotateCcw } from 'lucide-react'
import { uploadAdminImage } from '@/lib/upload'

/**
 * CanvasRoot — the ROOT Craft.js node.
 *
 * Owns the *page* background (color/gradient/image + overlay) so background
 * is the primary affordance instead of a draggable block, and sizes itself
 * to fill the parent `.device-frame-content` so the background covers the
 * whole viewport even when the canvas is otherwise empty.
 *
 * `position: relative` means children can opt into free-form absolute
 * placement via their own `_x` / `_y` / `_pos` props (see ResizableWrapper).
 */

interface CanvasRootProps {
  bgType?: 'color' | 'gradient' | 'image'
  bgColor?: string
  bgGradient?: string
  bgImage?: string            // data URL or public path
  bgSize?: 'cover' | 'contain' | 'auto'
  bgPosition?: string
  overlayColor?: string
  overlayOpacity?: number
  contentPadding?: number
  children?: ReactNode
}

export const CanvasRoot: UserComponent<CanvasRootProps> = ({ children }) => {
  // Read raw props so we can route every background field through
  // `getEffectiveProp` — mobile overrides land in `_mobile` and fall back
  // to the base when missing. Destructuring in the function signature
  // would lock us to the desktop values only.
  const { connectors: { connect }, rawProps } = useNode((n) => ({
    rawProps: (n.data.props ?? {}) as Record<string, unknown>,
  }))
  // CanvasRoot lives inside either:
  //   - `.device-frame-content` (builder), a flex column, OR
  //   - `.canvas-runtime-container` (runtime, app/[slug]/page.tsx), also a
  //     flex column with `minHeight: 100vh`.
  // In both cases `flex: 1 1 auto` stretches CanvasRoot to fill its parent.
  // `100vh` minHeight is kept as a defensive fallback for any non-flex
  // embedding context (e.g. ad-hoc previews).
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }))
  const breakpoint = useCanvasStore((s) => s.currentBreakpoint)

  // Effective background properties honor mobile overrides when the
  // renderer is on the mobile breakpoint. Defaults match the original
  // function-parameter defaults so new nodes look the same as before.
  const bgType = getEffectiveProp<CanvasRootProps['bgType']>(rawProps, breakpoint, 'bgType') ?? 'color'
  const bgColor = getEffectiveProp<string>(rawProps, breakpoint, 'bgColor') ?? '#0B1220'
  const bgGradient = getEffectiveProp<string>(rawProps, breakpoint, 'bgGradient')
    ?? 'linear-gradient(135deg, #0B1220 0%, #1a0f1f 100%)'
  const bgImage = getEffectiveProp<string>(rawProps, breakpoint, 'bgImage') ?? ''
  const bgSize = getEffectiveProp<CanvasRootProps['bgSize']>(rawProps, breakpoint, 'bgSize') ?? 'cover'
  const bgPosition = getEffectiveProp<string>(rawProps, breakpoint, 'bgPosition') ?? 'center'
  const overlayColor = getEffectiveProp<string>(rawProps, breakpoint, 'overlayColor') ?? '#000000'
  const overlayOpacity = getEffectiveProp<number>(rawProps, breakpoint, 'overlayOpacity') ?? 0
  const contentPadding = getEffectiveProp<number>(rawProps, breakpoint, 'contentPadding') ?? 0

  const bgStyle: CSSProperties =
    bgType === 'gradient' ? { backgroundImage: bgGradient, backgroundColor: bgColor }
    : bgType === 'image' && bgImage
      ? { backgroundImage: `url(${bgImage})`, backgroundSize: bgSize, backgroundPosition: bgPosition, backgroundRepeat: 'no-repeat', backgroundColor: bgColor }
    : { backgroundColor: bgColor }

  // Single-layer fluid canvas. `container-type: inline-size` turns this
  // element into a CSS container, which lets every descendant express
  // vertical and horizontal coordinates in `cqw` (= 1% of this element's
  // actual width). Resize the browser → every child reflows
  // proportionally via pure CSS, no JS measurement, no zoom quirks.
  //
  // Background sits on the same element as the content, so they're always
  // sized and positioned in the same coordinate space — no drift between
  // the bg image and the widgets layered on top. Ultrawide monitors show
  // the design at its natural proportional size (everything scales with
  // width). `_mobile` overrides still apply for structurally different
  // phone layouts.
  //
  // `contentPadding` is expressed in cqw too so it scales with the canvas
  // rather than being a fixed px border that looks tight on wide
  // viewports and enormous on narrow ones.
  const rootStyle: CSSProperties = {
    flex: '1 1 auto',
    minHeight: enabled ? '100%' : '100vh',
    alignSelf: 'stretch',
    width: '100%',
    position: 'relative',
    boxSizing: 'border-box',
    padding: `${contentPadding}cqw`,
    containerType: 'inline-size',
    containerName: 'canvas',
    ...bgStyle,
  }

  return (
    <div
      ref={(ref) => { if (ref) connect(ref) }}
      className="relative w-full"
      {...{ [CANVAS_ROOT_ATTR]: '1' }}
      style={rootStyle}
    >
      {overlayOpacity > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: overlayColor, opacity: overlayOpacity / 100 }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, minHeight: 'inherit' }}>
        {children}
      </div>
    </div>
  )
}

function CanvasRootSettings() {
  // Read the raw bag so `getEffectiveProp` can resolve overrides. The
  // settings panel shows values for whichever breakpoint the operator is
  // currently editing (toolbar device picker → breakpoint store).
  const { actions: { setProp }, rawProps } = useNode((n) => ({
    rawProps: (n.data.props ?? {}) as Record<string, unknown>,
  }))
  const breakpoint = useCanvasStore((s) => s.currentBreakpoint)
  const isMobile = breakpoint === 'mobile'
  const fileRef = useRef<HTMLInputElement | null>(null)

  /** Write a prop to the correct layer. Same pattern as the Size section
   *  of the block settings panel — mobile edits land in `_mobile`, desktop
   *  edits land in the base props. */
  const setField = <K extends string>(key: K, value: unknown) => {
    setProp((p: Record<string, unknown>) => {
      setEffectiveProp(p, breakpoint, key, value)
    })
  }
  const resetField = (key: string) => {
    setProp((p: Record<string, unknown>) => {
      clearMobileOverride(p, key)
    })
  }
  const overridden = (key: string) => isMobile && hasMobileOverride(rawProps, key)

  /** Typed read of a single effective prop for UI value/controlled inputs. */
  const read = <T,>(key: string): T | undefined =>
    getEffectiveProp<T>(rawProps, breakpoint, key)

  /** Chip button shown next to a label when this prop has a mobile
   *  override. Clicking it clears the override so the field re-inherits
   *  from desktop. */
  const ResetChip = ({ for_ }: { for_: string }) =>
    overridden(for_) ? (
      <button
        type="button"
        onClick={() => resetField(for_)}
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

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-upload of same file regardless of outcome
    if (!f) return
    try {
      // Push bytes to engine storage, then store only the public URL in
      // canvas JSON. Keeps payloads small so canvas-config PUT doesn't
      // blow past the 1 MB body limit.
      const url = await uploadAdminImage(f, 'backgrounds')
      setField('bgImage', url)
      setField('bgType', 'image')
    } catch (err) {
      // Surface the failure without crashing the settings panel — the
      // operator can retry or paste a URL manually below.
      alert(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  /** Layout row helper. `resetKey` pulls a reset chip next to the label
   *  when the operator is editing mobile and the prop diverges from base. */
  const row = (label: string, control: ReactNode, resetKey?: string) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: 'var(--builder-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
        {resetKey && <ResetChip for_={resetKey} />}
      </label>
      {control}
    </div>
  )
  const input: CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: 12,
    border: '1px solid var(--builder-line-2)', borderRadius: 6, background: 'var(--builder-surface)',
    color: 'var(--builder-ink)', fontFamily: 'inherit',
  }

  // Effective values for each control — reflect the layer being edited.
  const bgType = read<CanvasRootProps['bgType']>('bgType') ?? 'color'
  const bgColor = read<string>('bgColor') ?? '#0B1220'
  const bgGradient = read<string>('bgGradient') ?? ''
  const bgImage = read<string>('bgImage') ?? ''
  const bgSize = read<CanvasRootProps['bgSize']>('bgSize') ?? 'cover'
  const bgPosition = read<string>('bgPosition') ?? 'center'
  const overlayColor = read<string>('overlayColor') ?? '#000000'
  const overlayOpacity = read<number>('overlayOpacity') ?? 0
  const contentPadding = read<number>('contentPadding') ?? 0

  return (
    <div style={{ padding: 14 }}>
      {/* Layer badge — matches the one on the block Size panel so operators
          know edits here target the mobile override bucket (or base). */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            padding: '2px 6px', borderRadius: 3,
            background: isMobile ? 'var(--builder-accent, #4f46e5)' : 'var(--builder-line)',
            color: isMobile ? '#fff' : 'var(--builder-muted)',
          }}
          title={isMobile
            ? 'Background edits here only affect mobile. Desktop stays untouched.'
            : 'Background edits affect the base layout (desktop; inherited by mobile unless overridden).'}
        >
          {isMobile ? 'MOBILE' : 'DESKTOP'}
        </span>
      </div>

      {row('Background Type',
        <select value={bgType} onChange={(e) => setField('bgType', e.target.value as CanvasRootProps['bgType'])} style={input}>
          <option value="color">Solid Color</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
        </select>,
        'bgType'
      )}
      {row('Base Color',
        <input type="color" value={bgColor} onChange={(e) => setField('bgColor', e.target.value)} style={{ ...input, height: 32, padding: 2 }} />,
        'bgColor'
      )}
      {bgType === 'gradient' && row('CSS Gradient',
        <input type="text" value={bgGradient} onChange={(e) => setField('bgGradient', e.target.value)} style={input} placeholder="linear-gradient(135deg, #0B1220, #2A0B0B)" />,
        'bgGradient'
      )}
      {bgType === 'image' && (
        <>
          {row('Upload Image',
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ ...input, cursor: 'pointer', textAlign: 'left', padding: '8px 10px' }}
              >
                {bgImage ? 'Replace image…' : 'Choose file…'}
              </button>
              {bgImage && (
                <button
                  type="button"
                  onClick={() => setField('bgImage', '')}
                  style={{ ...input, width: 'auto', cursor: 'pointer', color: 'var(--builder-danger)' }}
                  title="Remove image"
                >
                  ×
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onUpload}
                style={{ display: 'none' }}
              />
            </div>,
            'bgImage'
          )}
          {bgImage && (
            <div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--builder-line-2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgImage} alt="bg preview" style={{ width: '100%', display: 'block', maxHeight: 120, objectFit: 'cover' }} />
            </div>
          )}
          {row('Or Image URL',
            <input type="text" value={bgImage?.startsWith('data:') ? '' : bgImage} onChange={(e) => setField('bgImage', e.target.value)} style={input} placeholder="https://…" />
          )}
          {row('Fit',
            <select value={bgSize} onChange={(e) => setField('bgSize', e.target.value as CanvasRootProps['bgSize'])} style={input}>
              <option value="cover">Cover (fill, may crop)</option>
              <option value="contain">Contain (fit, may letterbox)</option>
              <option value="auto">Auto (actual size)</option>
            </select>,
            'bgSize'
          )}
          {row('Position',
            <select value={bgPosition} onChange={(e) => setField('bgPosition', e.target.value)} style={input}>
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="top left">Top left</option>
              <option value="top right">Top right</option>
              <option value="bottom left">Bottom left</option>
              <option value="bottom right">Bottom right</option>
            </select>,
            'bgPosition'
          )}
        </>
      )}
      {row('Overlay Color',
        <input type="color" value={overlayColor} onChange={(e) => setField('overlayColor', e.target.value)} style={{ ...input, height: 32, padding: 2 }} />,
        'overlayColor'
      )}
      {row(`Overlay Opacity · ${overlayOpacity}%`,
        <input type="range" min={0} max={100} value={overlayOpacity} onChange={(e) => setField('overlayOpacity', Number(e.target.value))} style={{ width: '100%' }} />,
        'overlayOpacity'
      )}
      {/* Padding is in `cqw` so it scales with the canvas — a 5% inset stays
          visually right on both phone and ultrawide widths. */}
      {row(`Content Padding · ${contentPadding}%`,
        <input type="range" min={0} max={10} step={0.25} value={contentPadding} onChange={(e) => setField('contentPadding', Number(e.target.value))} style={{ width: '100%' }} />,
        'contentPadding'
      )}
    </div>
  )
}

CanvasRoot.craft = {
  displayName: 'Canvas',
  props: {
    bgType: 'color',
    bgColor: '#0B1220',
    bgGradient: 'linear-gradient(135deg, #0B1220 0%, #1a0f1f 100%)',
    bgImage: '',
    bgSize: 'cover',
    bgPosition: 'center',
    overlayColor: '#000000',
    overlayOpacity: 0,
    contentPadding: 0,
  },
  rules: {
    canDrag: () => false,
  },
  related: { settings: CanvasRootSettings },
}
