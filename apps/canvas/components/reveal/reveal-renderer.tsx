'use client'

import { Editor, Frame } from '@craftjs/core'
import { revealResolver } from './reveal-blocks'
import { RevealDataProvider, type RevealData } from './reveal-data-context'

/**
 * Runtime renderer for the custom (drag-and-drop authored) reveal.
 *
 * Mounts a read-only Craft.js Editor that deserializes the saved reveal
 * JSON. Blocks read live data (reward label, condition label, onClose)
 * from `RevealDataContext`, so the same tree works for both the editor's
 * preview and the actual player-facing reveal.
 *
 * `enabled={false}` disables Craft.js drag/select overlays — players get
 * a pure render with no editor chrome.
 */

export function RevealRenderer({ json, data }: { json: string; data: RevealData }) {
  if (!json || !json.trim()) return null
  return (
    <RevealDataProvider value={data}>
      <Editor resolver={revealResolver} enabled={false}>
        <Frame data={json} />
      </Editor>
    </RevealDataProvider>
  )
}
