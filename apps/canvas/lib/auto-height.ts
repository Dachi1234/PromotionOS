/**
 * Auto-height for iframe embeds.
 *
 * Canvas runtimes are hosted inside a parent iframe that has no way to
 * know the document height. We post the current `scrollHeight` to the
 * parent whenever it changes so the parent can resize the iframe.
 *
 * Historically this used a MutationObserver + 1s polling fallback. That
 * missed CSS-driven size changes (images loading, fonts swapping, media
 * query flips on rotate) and caused visible jank because the parent was
 * always a frame behind.
 *
 * New implementation:
 *   - `ResizeObserver` on `<body>` — fires on any layout change,
 *     including image loads and font swaps.
 *   - `MutationObserver` still covers attribute/classname changes that
 *     don't trigger layout (e.g. theme swaps that only recolour).
 *   - A `requestAnimationFrame`-throttled `reportHeight()` prevents
 *     posting on every intermediate tick during an animation.
 *   - Graceful fallback to the old polling path when ResizeObserver
 *     isn't available (old iOS).
 */

import { sendToParent } from './post-message'

let lastHeight = 0
let rafPending = false

function measureAndPost(): void {
  if (typeof document === 'undefined') return
  // Use the max of documentElement/body so a container with explicit
  // height doesn't report `0` on empty-body frames.
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
  )
  if (height !== lastHeight) {
    lastHeight = height
    sendToParent({ type: 'CANVAS_HEIGHT', height })
  }
}

/** Throttled public entry — safe to call from any callback. */
export function reportHeight(): void {
  if (rafPending) return
  rafPending = true
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      rafPending = false
      measureAndPost()
    })
  } else {
    // SSR or exotic environments — measure synchronously.
    rafPending = false
    measureAndPost()
  }
}

/**
 * Start tracking the document's resolved height and posting it to the
 * parent frame. Returns a teardown fn — call it on page unload or when
 * switching between campaigns inside the same tab.
 */
export function startAutoHeight(): () => void {
  if (typeof window === 'undefined') return () => {}

  const mo = new MutationObserver(() => reportHeight())
  mo.observe(document.body, { childList: true, subtree: true, attributes: true })

  // ResizeObserver is the reliable signal. We observe <body>, not
  // documentElement, because some browsers don't fire RO entries on
  // <html> reliably.
  let ro: ResizeObserver | null = null
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => reportHeight())
    ro.observe(document.body)
  }

  // Low-frequency safety net — catches anything the observers miss
  // (e.g. scroll-locked viewport changes inside embeds).
  const interval = window.setInterval(reportHeight, 2000)

  // Font loading and image loads trigger layout; `load` on the window
  // gives us one final measurement after all subresources resolve.
  const onLoad = () => reportHeight()
  window.addEventListener('load', onLoad, { once: true })

  reportHeight()

  return () => {
    mo.disconnect()
    ro?.disconnect()
    window.clearInterval(interval)
    window.removeEventListener('load', onLoad)
  }
}
