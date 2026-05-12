'use client'

import { useEffect, useState } from 'react'
import { Editor, Frame } from '@craftjs/core'
import { useParams } from 'next/navigation'
import { resolver } from '@/lib/resolver'
import { useCanvasStore } from '@/stores/canvas-store'
import { useCanvasConfig, useCampaignDetail } from '@/hooks/use-canvas-data'
import { RuntimeShell } from '@/components/runtime/runtime-shell'
import { SkeletonLoader } from '@/components/runtime/skeleton-loader'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { ThemeApplier, type CampaignThemeConfig } from '@/components/runtime/theme-applier'
import { CanvasErrorBoundary } from '@/components/runtime/canvas-error-boundary'
import { SoundFxProvider } from '@/components/runtime/sound-fx'
import { Providers } from '@/app/providers'
import { t } from '@/lib/i18n'
import { motion } from 'framer-motion'
import { migrateCanvasConfig } from '@/lib/responsive'
import { useViewportBreakpoint } from '@/lib/use-breakpoint'

function RuntimeInner() {
  const { slug } = useParams<{ slug: string }>()
  const { language, theme } = useCanvasStore()
  const { data: canvasData, isLoading: canvasLoading, error: canvasError } = useCanvasConfig(slug)
  const { data: campaignData } = useCampaignDetail(slug)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  // Keep `currentBreakpoint` in the canvas store synced with the viewport
  // so block renderers pick up the right override layer (_mobile vs base).
  // Updates on window resize.
  useViewportBreakpoint()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (canvasLoading) {
    // Infer skeleton shape from the campaign's primary mechanic (available
    // via campaignData even before canvasData lands since they fetch in
    // parallel but campaignData is lighter). Defaults to 'wheel' which is
    // the most common shape and reads well as a generic loading cue.
    const mechanics = (campaignData as { mechanics?: Array<{ type?: string }> } | undefined)?.mechanics
    const firstType = mechanics?.[0]?.type ?? ''
    const variant: 'wheel' | 'progress' | 'leaderboard' | 'mission' | 'generic' =
      firstType.includes('wheel') ? 'wheel'
      : firstType.includes('leaderboard') ? 'leaderboard'
      : firstType.includes('mission') ? 'mission'
      : firstType.includes('progress') ? 'progress'
      : 'wheel'
    return <SkeletonLoader variant={variant} />
  }

  if (canvasError || !canvasData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold">{t(language, 'campaign.notFound')}</p>
          <p className="text-sm text-gray-400">{t(language, 'common.error')}</p>
        </div>
      </div>
    )
  }

  const campaign = campaignData as Record<string, unknown> | undefined
  const isEnded = campaign?.status === 'ENDED'

  // Campaign-level theme config — `id` selects a named theme, `overrides`
  // patches individual CSS tokens. Either may come from the canvas payload
  // or the campaign record depending on Studio version.
  const campaignTheme: CampaignThemeConfig | null =
    ((canvasData as Record<string, unknown>)?.theme as CampaignThemeConfig | undefined)
    ?? ((campaign?.theme as CampaignThemeConfig | undefined) ?? null)

  const canvasConfig = canvasData.canvasConfig
  // Run the same migration the builder runs so runtime can display legacy
  // campaigns (pixel coordinates) without operator intervention. No-op on
  // already-migrated data.
  const serialized = migrateCanvasConfig(canvasConfig as string | object | null)

  // The theme-token layer (bg-background/text-foreground) drives colors now.
  // We only honor fontFamily from the legacy store since it's not part of the
  // token set yet. Inline bg/text colors are intentionally dropped so they
  // stop fighting with the theme tokens — that was the root cause of the
  // "everything washes out to dark slate" bug.
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: theme.fontFamily }}
    >
      <ThemeApplier campaignTheme={campaignTheme} />
      {/* Sound is opt-in per campaign. Defaults to off; the operator
          toggles via `canvasData.sound` once that field lands in Studio. */}
      <SoundFxProvider
        enabled={Boolean((canvasData as Record<string, unknown>)?.sound)}
      >
      {isEnded && (
        <div className="bg-amber-600 text-white text-center py-2 text-sm font-medium">
          {t(language, 'campaign.ended')}
        </div>
      )}

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {serialized ? (
          // Full-viewport fluid canvas. CanvasRoot is a CSS container
          // (`container-type: inline-size`) so every block coordinate —
          // both horizontal (`%`) and vertical (`cqw`) — resolves against
          // CanvasRoot's actual width. The layout stays proportionally
          // identical from phone to ultrawide with no JS measurement.
          //
          // Flex column so CanvasRoot's `flex: 1 1 auto` stretches to fill
          // the viewport height, mirroring the builder's
          // `.device-frame-content` parent.
          <div
            className="canvas-runtime-container"
            style={{
              width: '100%',
              minHeight: '100vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CanvasErrorBoundary accentColor={(theme as unknown as { accentColor?: string })?.accentColor}>
              <Editor resolver={resolver} enabled={false}>
                <Frame data={serialized} />
              </Editor>
            </CanvasErrorBoundary>
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center text-gray-500">
            <p>No canvas configured for this promotion.</p>
          </div>
        )}
      </motion.div>

      <LanguageSwitcher />
      </SoundFxProvider>
    </div>
  )
}

export default function RuntimePage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <Providers>
      <RuntimeShell slug={slug}>
        <RuntimeInner />
      </RuntimeShell>
    </Providers>
  )
}
