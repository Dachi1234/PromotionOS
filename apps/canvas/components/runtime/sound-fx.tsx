'use client'

/**
 * SoundFx provider + haptics helper.
 *
 * Widgets call `useSoundFx().play('win')` to fire an audio cue; the
 * provider resolves the cue to a URL by reading the theme-scoped CSS
 * variables (`--sfx-win` etc.) that ThemeApplier writes on `:root`. That
 * means sound families swap automatically when the theme changes, just
 * like the colour tokens.
 *
 * Key decisions:
 *   - Audio is OFF by default. Autoplay policies kill uninvited sound in
 *     embedded iframes, and operators who care about audio will opt in.
 *     The operator toggles it per-campaign (ThemeApplier's `--sfx-enabled`
 *     token, not wired into settings yet — the hook here respects the
 *     runtime default).
 *   - We lazy-create `HTMLAudioElement`s on first play, cache them, and
 *     reset `currentTime` on replay so rapid-fire events don't queue.
 *   - Haptics use `navigator.vibrate` — quietly no-ops where unsupported
 *     (desktop, iOS Safari). The pattern map keeps vibration copies short
 *     enough that even in noisy vibration-heavy UX they don't annoy.
 *
 * SSR-safe: no `window`/`document` access during render.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

export type SoundCue = 'coin' | 'click' | 'win' | 'tick' | 'error'

/** Vibration patterns (ms). Negative/odd indices are pause, even are on. */
const HAPTIC_PATTERNS: Record<SoundCue, number | number[]> = {
  click: 8,
  coin: [12, 40, 12],
  win: [24, 30, 80],
  tick: 6,
  error: [30, 60, 30, 60, 30],
}

interface SoundFxApi {
  play: (cue: SoundCue) => void
  haptic: (cue: SoundCue) => void
  /** Fires both together — sugar for "user just got positive feedback". */
  feedback: (cue: SoundCue) => void
  enabled: boolean
}

const SoundFxContext = createContext<SoundFxApi | null>(null)

interface ProviderProps {
  /** Default off — operator opts in per campaign. Honours prefers-reduced-
   *  motion as a separate hard gate (no sound when reduced-motion is on). */
  enabled?: boolean
  /** Disable haptics specifically — some operators want sound without
   *  vibration on mobile. */
  haptics?: boolean
  children: React.ReactNode
}

export function SoundFxProvider({
  enabled = false,
  haptics = true,
  children,
}: ProviderProps): React.JSX.Element {
  // Audio element cache — reused across plays so we don't spin up
  // hundreds of DOM nodes on a rapid spin.
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  const resolveUrl = useCallback((cue: SoundCue): string | null => {
    if (typeof window === 'undefined') return null
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--sfx-${cue}`)
      .trim()
    // The CSS tokens live as quoted strings (e.g. "\"/sfx/win-playful.mp3\"")
    // so we strip any wrapping quotes before handing to Audio.
    const cleaned = raw.replace(/^["']|["']$/g, '')
    return cleaned || null
  }, [])

  const play = useCallback((cue: SoundCue) => {
    if (!enabled || typeof window === 'undefined') return
    // Gate on reduced-motion (a proxy for "user doesn't want flashy stuff").
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const url = resolveUrl(cue)
    if (!url) return

    const cache = cacheRef.current
    let el = cache.get(url)
    if (!el) {
      el = new Audio(url)
      el.preload = 'auto'
      cache.set(url, el)
    }
    try {
      el.currentTime = 0
      void el.play().catch(() => {
        /* autoplay denied; quietly ignore */
      })
    } catch {
      /* noop */
    }
  }, [enabled, resolveUrl])

  const haptic = useCallback((cue: SoundCue) => {
    if (!haptics || typeof navigator === 'undefined') return
    if (typeof navigator.vibrate !== 'function') return
    // Reduced-motion also disables haptics.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    try {
      navigator.vibrate(HAPTIC_PATTERNS[cue])
    } catch {
      /* some browsers throw in iframes; swallow */
    }
  }, [haptics])

  const feedback = useCallback((cue: SoundCue) => {
    play(cue)
    haptic(cue)
  }, [play, haptic])

  // Flush cached <audio> elements on unmount so an operator switching
  // themes in the builder doesn't hold on to stale blobs.
  useEffect(() => {
    const cache = cacheRef.current
    return () => {
      cache.forEach((el) => {
        el.pause()
        el.src = ''
      })
      cache.clear()
    }
  }, [])

  const value = useMemo<SoundFxApi>(
    () => ({ play, haptic, feedback, enabled }),
    [play, haptic, feedback, enabled],
  )

  return <SoundFxContext.Provider value={value}>{children}</SoundFxContext.Provider>
}

/**
 * Returns the sound API. Outside a provider returns a no-op so widgets
 * can call `feedback('win')` unconditionally without defensive checks.
 */
export function useSoundFx(): SoundFxApi {
  const ctx = useContext(SoundFxContext)
  if (ctx) return ctx
  return {
    play: () => {},
    haptic: () => {},
    feedback: () => {},
    enabled: false,
  }
}
