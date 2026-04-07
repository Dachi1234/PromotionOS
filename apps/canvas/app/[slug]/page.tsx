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
import { Providers } from '@/app/providers'
import { t } from '@/lib/i18n'
import { motion } from 'framer-motion'

function RuntimeInner() {
  const { slug } = useParams<{ slug: string }>()
  const { language, theme } = useCanvasStore()
  const { data: canvasData, isLoading: canvasLoading, error: canvasError } = useCanvasConfig(slug)
  const { data: campaignData } = useCampaignDetail(slug)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (canvasLoading) return <SkeletonLoader />

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

  const canvasConfig = canvasData.canvasConfig
  const serialized = typeof canvasConfig === 'string' ? canvasConfig : canvasConfig ? JSON.stringify(canvasConfig) : null

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontFamily,
      }}
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
          <Editor resolver={resolver} enabled={false}>
            <Frame data={serialized} />
          </Editor>
        ) : (
          <div className="min-h-screen flex items-center justify-center text-gray-500">
            <p>No canvas configured for this promotion.</p>
          </div>
        )}
      </motion.div>

      <LanguageSwitcher />
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
