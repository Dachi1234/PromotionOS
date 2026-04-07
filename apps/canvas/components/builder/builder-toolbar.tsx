'use client'

import { useEditor } from '@craftjs/core'
import { useState, useEffect, useCallback } from 'react'
import { Undo2, Redo2, Save, Eye, Monitor, Tablet, Smartphone, Globe } from 'lucide-react'
import { sendToParent } from '@/lib/post-message'
import { useCanvasStore } from '@/stores/canvas-store'

interface ToolbarProps {
  campaignName: string
  onSave: () => Promise<void>
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError?: string | null
}

export function BuilderToolbar({ campaignName, onSave, saveStatus, saveError }: ToolbarProps) {
  const { actions, canUndo, canRedo, nodeCount } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    nodeCount: Object.keys(state.nodes).length,
  }))
  const { language, setLanguage } = useCanvasStore()
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone')

  useEffect(() => {
    sendToParent({ type: 'CANVAS_BLOCK_COUNT', count: nodeCount })
  }, [nodeCount])

  const handlePreview = useCallback(() => {
    window.open(`${window.location.origin}/preview`, '_blank')
  }, [])

  useEffect(() => {
    const widths: Record<string, number> = { phone: 375, tablet: 768, desktop: 1200 }
    document.documentElement.style.setProperty('--canvas-width', `${widths[device]}px`)
  }, [device])

  const statusText: Record<string, string> = { idle: '', saving: 'Saving...', saved: 'All changes saved', error: saveError || 'Save failed' }

  return (
    <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold truncate max-w-[200px]">{campaignName || 'Untitled Campaign'}</h2>
        <span className="text-xs text-muted-foreground">{statusText[saveStatus]}</span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => setDevice('phone')} className={`p-1.5 rounded ${device === 'phone' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Smartphone className="h-4 w-4" /></button>
        <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded ${device === 'tablet' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Tablet className="h-4 w-4" /></button>
        <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Monitor className="h-4 w-4" /></button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => actions.history.undo()} disabled={!canUndo} className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
        <button onClick={() => actions.history.redo()} disabled={!canRedo} className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"><Redo2 className="h-4 w-4" /></button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => setLanguage(language === 'en' ? 'ka' : 'en')} className="p-1.5 rounded text-muted-foreground hover:text-foreground flex items-center gap-1"><Globe className="h-4 w-4" /><span className="text-[10px] uppercase font-bold">{language}</span></button>
        <button onClick={handlePreview} className="p-1.5 rounded text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></button>
        <button onClick={onSave} className="ml-2 flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"><Save className="h-3.5 w-3.5" /> Save</button>
      </div>
    </div>
  )
}
