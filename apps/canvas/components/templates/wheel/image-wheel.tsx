'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { WheelTemplateProps } from '../shared-types'
import { fluidSize } from '@/lib/responsive'

/**
 * Image Wheel — uses a builder-uploaded PNG as the wheel face instead of
 * drawing slices. The rotation math is identical to generated wheels: the
 * backend returns a `sliceIndex` and the widget rotates the image so slice
 * N lands under the top pointer.
 *
 * Contract the builder needs to uphold:
 *   1. Image slice order (clockwise from top) must match the backend
 *      mechanic's reward order (index 0 = topmost slice, etc.).
 *   2. Set `sliceOffsetDeg` if the image's "slice 0" boundary doesn't line
 *      up with the top pointer — this is a pre-rotation so the first slice
 *      centres under the arrow.
 *   3. `slices.length` is the source of truth for how many wedges to target
 *      (must equal the number of slices actually drawn in the PNG).
 *
 * If `innerFaceImage` is provided, a second image layer rotates on top —
 * same contract, but authored as a separate "inner" mechanic config.
 *
 * The visual is decoration. The reward is whatever the server says.
 */

export function ImageWheel({
  slices, innerSlices, rotation, innerRotation = 0,
  spinning, canSpin, spinsRemaining,
  onSpin, spinButtonLabel, spinButtonColor,
  spinButtonTextColor, spinButtonFontSize, spinButtonRadius,
  spinButtonPaddingX, spinButtonPaddingY,
  faceImage, innerFaceImage, sliceOffsetDeg = 0, innerSliceOffsetDeg = 0,
  outerPointerImage, outerPointerSize,
  innerPointerImage, innerPointerSize, showInnerPointer,
  centerHubImage, centerHubSize,
  spinDurationMs, innerSpinDurationMs,
  accentColor = '#1DB954',
}: WheelTemplateProps) {
  const reduced = useReducedMotion()
  const outerCount = slices.length || 8
  const innerCount = innerSlices?.length || 0

  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-start"
      style={{ width: '100%' }}
    >
      <div className="relative" style={{ width: '100%', aspectRatio: '1 / 1' }}>
        {/* Outer image layer */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
          }}
          animate={{ rotate: rotation + sliceOffsetDeg }}
          transition={{ duration: reduced ? 0.3 : Math.max(0.4, (spinDurationMs ?? 4800) / 1000), ease: [0.15, 0.8, 0.2, 1] }}
        >
          {faceImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={faceImage}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: '#1a1a2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280', fontSize: 12, padding: 20, textAlign: 'center',
            }}>
              Upload a wheel image in the right panel.<br />
              Set the slice count to match.
            </div>
          )}
        </motion.div>

        {/* Inner image layer (optional). Renders whenever an inner image is
            uploaded, independent of innerSlices — slices are for rotation
            targeting, the image itself is just decoration. */}
        {innerFaceImage && (
          <motion.div
            style={{
              position: 'absolute', inset: '22%',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.4)',
            }}
            // Inner image rotates INDEPENDENTLY of the outer. For
            // concentric-image wheels this means the outer spins first,
            // then the inner spins (sequenced by WheelWidget.handleSpin
            // via `innerRotation`), producing the same reward + condition
            // reveal flow as the drawn concentric template.
            animate={{ rotate: innerRotation + innerSliceOffsetDeg }}
            transition={{ duration: reduced ? 0.25 : Math.max(0.3, (innerSpinDurationMs ?? 2800) / 1000), ease: [0.15, 0.8, 0.2, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={innerFaceImage}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
            />
          </motion.div>
        )}

        {/* ──────────── Outer pointer ────────────
            Custom uploaded PNG wins; otherwise fall back to the built-in
            teardrop (triangle + dot). Size is % of wheel width so it
            scales with the container. */}
        {outerPointerImage ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: `-${(outerPointerSize ?? 10) * 0.35}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${outerPointerSize ?? 10}%`,
              aspectRatio: '1 / 1.2',
              zIndex: 3,
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.55))',
              pointerEvents: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outerPointerImage} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} />
          </div>
        ) : (
          <>
            <div
              aria-hidden
              style={{
                position: 'absolute', top: -4, left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: `26px solid ${accentColor}`,
                filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.55))',
                zIndex: 2,
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute', top: -10, left: '50%',
                transform: 'translateX(-50%)',
                width: 16, height: 16, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, #2FDF6E, ${accentColor})`,
                boxShadow: `0 0 0 2px #C9A24B, 0 2px 4px rgba(0,0,0,0.5)`,
                zIndex: 3,
              }}
            />
          </>
        )}

        {/* ──────────── Inner pointer ────────────
            Rides at the top edge of the inner wheel (22% inset area), so
            it looks like a second teardrop pointing into the inner ring.
            Only renders when an inner image + pointer are configured. */}
        {innerFaceImage && showInnerPointer && (
          innerPointerImage ? (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                // Inner wheel starts at 22% inset; place the pointer's base
                // just above that edge so the tip touches the inner rim.
                top: `${22 - (innerPointerSize ?? 7) * 0.35}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${innerPointerSize ?? 7}%`,
                aspectRatio: '1 / 1.2',
                zIndex: 4,
                filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))',
                pointerEvents: 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={innerPointerImage} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} />
            </div>
          ) : (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: `${22 - (innerPointerSize ?? 6) * 0.4}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '9px solid transparent',
                borderRight: '9px solid transparent',
                borderTop: `16px solid ${accentColor}`,
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
                zIndex: 4,
              }}
            />
          )
        )}

        {/* ──────────── Centre hub logo ────────────
            Sits on top of the wheel middle. Only renders when the operator
            uploads a hub image — otherwise the inner image (or the outer
            image's centre) shows through untouched. */}
        {centerHubImage && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: `${centerHubSize ?? 18}%`,
              aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={centerHubImage} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} />
          </div>
        )}

        {/* Slice-count debug overlay — only while not spinning and only if
            the builder has asked for it via a future flag. Currently hidden
            to keep the runtime clean; surface in the builder-only overlay. */}
      </div>

      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin || spinning}
        style={{
          marginTop: 28,
          padding: `${spinButtonPaddingY ?? 14}px ${spinButtonPaddingX ?? 48}px`,
          fontSize: spinButtonFontSize ?? fluidSize(13, 17),
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: spinButtonTextColor ?? '#062A15',
          background: spinButtonColor
            ? `linear-gradient(180deg, ${spinButtonColor} 0%, ${spinButtonColor} 100%)`
            : `linear-gradient(180deg, #2FDF6E 0%, ${accentColor} 60%, #0E6A32 100%)`,
          border: `1px solid ${accentColor}`,
          borderRadius: spinButtonRadius ?? 999,
          cursor: canSpin && !spinning ? 'pointer' : 'not-allowed',
          opacity: canSpin && !spinning ? 1 : 0.45,
          boxShadow: `0 8px 22px -6px rgba(29,185,84,0.55), 0 0 0 1px rgba(255,255,255,0.25) inset, 0 -2px 0 rgba(0,0,0,0.25) inset`,
          fontFamily: 'var(--font-display, system-ui)',
        }}
      >
        {spinning ? 'Spinning…' : spinButtonLabel || 'Spin'}
      </button>
      {spinsRemaining != null && (
        <div style={{ marginTop: 10, fontSize: fluidSize(10, 12), color: '#9FB3C8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
          {spinsRemaining} {spinsRemaining === 1 ? 'spin' : 'spins'} remaining
        </div>
      )}
      {/* Signal wedge count visibly in builder so the author knows what
          slice count the rotation math is using vs. the image. Tiny caption. */}
      <div style={{ marginTop: 6, fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>
        {outerCount} outer slice{outerCount === 1 ? '' : 's'}{innerFaceImage ? ` · ${innerCount || '?'} inner` : ''}
      </div>
    </div>
  )
}
