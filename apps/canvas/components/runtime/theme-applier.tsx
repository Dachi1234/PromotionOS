'use client'

/**
 * ThemeApplier — writes the active theme id to `<html data-theme="...">` and
 * applies any campaign-level token overrides as inline CSS variables.
 *
 * The canvas config payload may carry a `theme` object shaped like:
 *   { id: 'casino-lux', overrides?: { '--primary': '262 83% 58%', ... } }
 *
 * `id` selects one of the named themes from `lib/themes.ts`. `overrides`
 * lets the Studio wizard's colour pickers patch specific tokens without
 * forking the entire theme — e.g. operators can pick their own brand
 * primary on top of `playful`.
 *
 * Mount once near the root. On unmount, the theme attribute is left in
 * place so mid-session theme switches don't flicker to the default.
 */

import { useEffect } from 'react'
import { useCanvasStore } from '@/stores/canvas-store'
import { isValidThemeId, DEFAULT_THEME } from '@/lib/themes'

export interface CampaignThemeConfig {
  id?: string
  overrides?: Record<string, string>
}

export function ThemeApplier({
  campaignTheme,
}: {
  campaignTheme?: CampaignThemeConfig | null
}): null {
  const storeThemeId = useCanvasStore((s) => s.themeId)
  const setThemeId = useCanvasStore((s) => s.setThemeId)

  // Adopt the campaign's preferred theme when it loads.
  useEffect(() => {
    const candidate = campaignTheme?.id
    if (candidate && isValidThemeId(candidate) && candidate !== storeThemeId) {
      setThemeId(candidate)
    }
  }, [campaignTheme?.id, storeThemeId, setThemeId])

  // Reflect storeThemeId + overrides onto <html>.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const id = storeThemeId || DEFAULT_THEME
    root.dataset.theme = id

    const overrides = campaignTheme?.overrides ?? {}
    const keys = Object.keys(overrides)
    for (const key of keys) {
      root.style.setProperty(key, overrides[key]!)
    }
    return () => {
      for (const key of keys) {
        root.style.removeProperty(key)
      }
    }
  }, [storeThemeId, campaignTheme?.overrides])

  return null
}
