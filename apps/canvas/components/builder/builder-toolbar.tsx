'use client'

import { useEditor } from '@craftjs/core'
import { useEffect, useCallback } from 'react'
import { Undo2, Redo2, Eye, Globe, ChevronRight, Sparkles } from 'lucide-react'
import { sendToParent } from '@/lib/post-message'
import { useCanvasStore } from '@/stores/canvas-store'

interface ToolbarProps {
  campaignName: string
  onSave: () => Promise<void>
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError?: string | null
}

/** Top chrome bar. Three zones:
 *  - left (260px): brand + env label, matches left-rail width
 *  - center (flex): breadcrumb trail with a status pill for the campaign
 *  - right (340px): save status + history + language + preview + publish,
 *    matches right-rail width
 *
 *  Keep this narrow and quiet — the promos inside the stage do the shouting.
 *  Device toggle + zoom now live on the stage-toolbar, not here.
 */
export function BuilderToolbar({ campaignName, onSave, saveStatus, saveError }: ToolbarProps) {
  const { actions, canUndo, canRedo, nodeCount } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    nodeCount: Object.keys(state.nodes).length,
  }))
  const { language, setLanguage } = useCanvasStore()

  useEffect(() => {
    sendToParent({ type: 'CANVAS_BLOCK_COUNT', count: nodeCount })
  }, [nodeCount])

  const handlePreview = useCallback(() => {
    window.open(`${window.location.origin}/preview`, '_blank')
  }, [])

  const statusText: Record<string, string> = {
    idle: '',
    saving: 'Saving…',
    saved: 'All changes saved',
    error: saveError || 'Save failed',
  }

  return (
    <header className="builder-topbar">
      <div className="builder-topbar-left">
        <div className="builder-topbar-logo">P</div>
        <div>
          <div className="builder-topbar-brand-name">PromoCanvas</div>
          <div className="builder-topbar-brand-env">Builder · Studio</div>
        </div>
      </div>

      <div className="builder-topbar-center">
        <div className="builder-breadcrumb">
          <a href="#">Campaigns</a>
          <ChevronRight size={12} />
          <span className="builder-breadcrumb-current">
            {campaignName || 'Untitled Campaign'}
            <span className="builder-status-pill active">Draft</span>
          </span>
        </div>
      </div>

      <div className="builder-topbar-right">
        <span className={`builder-save-status${saveStatus === 'error' ? ' dirty' : ''}`}>
          {statusText[saveStatus]}
        </span>
        <button
          type="button"
          className="builder-btn-icon"
          title="Undo"
          onClick={() => actions.history.undo()}
          disabled={!canUndo}
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          className="builder-btn-icon"
          title="Redo"
          onClick={() => actions.history.redo()}
          disabled={!canRedo}
        >
          <Redo2 size={15} />
        </button>
        <div className="builder-divider-v" />
        <button
          type="button"
          className="builder-btn builder-btn-ghost"
          onClick={() => setLanguage(language === 'en' ? 'ka' : 'en')}
          title="Toggle language"
        >
          <Globe size={14} />
          <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{language}</span>
        </button>
        <button type="button" className="builder-btn builder-btn-secondary" onClick={handlePreview}>
          <Eye size={14} /> Preview
        </button>
        <button type="button" className="builder-btn builder-btn-primary" onClick={onSave}>
          <Sparkles size={14} /> Publish
        </button>
      </div>
    </header>
  )
}
