'use client'

import { useCanvasStore } from '@/stores/canvas-store'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useCanvasStore()
  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ka' : 'en')}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-gray-800/90 backdrop-blur-sm px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-gray-700 transition-colors"
    >
      <Globe className="h-3.5 w-3.5" />
      {language === 'en' ? 'KA' : 'EN'}
    </button>
  )
}
