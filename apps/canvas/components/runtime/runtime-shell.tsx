'use client'

import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/stores/canvas-store'
import { listenForParentMessages } from '@/lib/post-message'
import { startAutoHeight } from '@/lib/auto-height'
import { t } from '@/lib/i18n'
import { TestToolbar } from '@/components/testing/test-toolbar'

export function RuntimeShell({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { sessionToken, isTestMode, isAdminPreview, setSessionToken, setLanguage, setCampaignSlug, setBuilder, setTestMode, setAdminPreview, language } = useCanvasStore()
  const [authTimeout, setAuthTimeout] = useState(false)

  useEffect(() => {
    setBuilder(false)
    setCampaignSlug(slug)

    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    const previewMode = params.get('preview')
    const testModeParam = params.get('testMode')

    if (tokenParam) {
      setSessionToken(tokenParam)
      if (testModeParam === '1') setTestMode(true)
    } else if (previewMode === 'admin') {
      setSessionToken('__admin_preview__')
      setAdminPreview(true)
    }

    const langParam = params.get('lang')
    if (langParam === 'en' || langParam === 'ka') setLanguage(langParam)

    const cleanup = listenForParentMessages((msg) => {
      if (msg.type === 'PARENT_SESSION_TOKEN') setSessionToken(msg.token)
      if (msg.type === 'PARENT_LANGUAGE' && (msg.lang === 'en' || msg.lang === 'ka')) setLanguage(msg.lang)
    })

    const autoHeightCleanup = startAutoHeight()

    const timeout = setTimeout(() => {
      if (!useCanvasStore.getState().sessionToken) setAuthTimeout(true)
    }, 3000)

    return () => { cleanup(); autoHeightCleanup(); clearTimeout(timeout) }
  }, [slug, setSessionToken, setLanguage, setCampaignSlug, setBuilder, setTestMode, setAdminPreview])

  if (authTimeout && !sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold">{t(language, 'auth.loginRequired')}</p>
          <button onClick={() => {
            import('@/lib/post-message').then(({ sendToParent }) => sendToParent({ type: 'CANVAS_AUTH_REQUEST' }))
          }} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white">
            {t(language, 'auth.loginButton')}
          </button>
        </div>
      </div>
    )
  }

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-pulse text-white/60 text-sm">{t(language, 'common.loading')}</div>
      </div>
    )
  }

  return (
    <>
      {isAdminPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400">
          Admin preview — interactions disabled. Use &quot;Test as Player&quot; in Studio for full testing.
        </div>
      )}
      {isTestMode && <TestToolbar slug={slug} />}
      {children}
    </>
  )
}
