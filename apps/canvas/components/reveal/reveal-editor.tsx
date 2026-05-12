'use client'

import { useState, useEffect } from 'react'
import { Editor, Frame, Element, useEditor, type UserComponent } from '@craftjs/core'
import { X, Plus } from 'lucide-react'
import { revealResolver, RevealCanvas, RevealText, RevealRewardLabel, RevealConditionLabel, RevealProgressBar, RevealCtaButton, RevealImage } from './reveal-blocks'
import { RevealDataProvider } from './reveal-data-context'
import type { PrizeRevealPayload } from '@/components/shared/prize-reveal'

/**
 * Full-screen Craft.js editor for authoring the reveal popup.
 *
 * Launched from the wheel widget's Prize Reveal section. Operator drags
 * elements onto the canvas, positions them freely over the bg image, and
 * saves — the serialized tree lands back on the wheel widget's
 * `revealCanvasJson` prop.
 *
 * Intentionally isolated: its own <Editor>, its own resolver, its own
 * settings panel. The main canvas's selection / toolbar never sees these
 * nodes.
 */

export interface RevealEditorProps {
  open: boolean
  initialJson: string
  onSave: (json: string) => void
  onClose: () => void
  /** Sample reward used to populate live blocks in edit mode so the
   *  operator sees realistic content while positioning. */
  samplePayload: PrizeRevealPayload
  /** Operator-authored strings from the wheel widget (fall-throughs when
   *  a block's own content prop is empty). */
  defaults: { youWon: string; toClaim: string; ctaLabel: string }
}

export function RevealEditor({ open, initialJson, onSave, onClose, samplePayload, defaults }: RevealEditorProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-gray-900/95"
      role="dialog"
      aria-modal="true"
      aria-label="Reveal editor"
    >
      <RevealDataProvider value={{ payload: samplePayload, onClose: () => {}, previewMode: true, defaults }}>
        <Editor resolver={revealResolver}>
          <EditorShell initialJson={initialJson} onSave={onSave} onClose={onClose} />
        </Editor>
      </RevealDataProvider>
    </div>
  )
}

function EditorShell({ initialJson, onSave, onClose }: { initialJson: string; onSave: (j: string) => void; onClose: () => void }) {
  const { actions, query, connectors, selected } = useEditor((state) => {
    const selectedIds = Array.from(state.events.selected)
    const id = selectedIds[0]
    const node = id ? state.nodes[id] : null
    return {
      selected: node
        ? { id, name: node.data.displayName ?? node.data.name, settings: node.related?.settings }
        : null,
    }
  })

  // Deserialize the incoming JSON on mount. If empty, seed a fresh canvas.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (hydrated) return
    if (initialJson && initialJson.trim()) {
      try {
        actions.deserialize(initialJson)
        setHydrated(true)
        return
      } catch {
        // fall through to fresh seed
      }
    }
    setHydrated(true)
  }, [actions, initialJson, hydrated])

  const handleSave = () => {
    onSave(query.serialize())
    onClose()
  }

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-700 bg-gray-800 px-4 py-2 text-white">
        <div className="text-sm font-semibold">Reveal editor</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
          >
            Save reveal
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded p-1 text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body: left palette · centre canvas · right settings */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <aside className="w-48 shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-800 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Add to reveal</div>
          <div className="space-y-1.5">
            <PaletteItem label="Text" component={RevealText} connectors={connectors} />
            <PaletteItem label="Reward label" component={RevealRewardLabel} connectors={connectors} />
            <PaletteItem label="Condition label" component={RevealConditionLabel} connectors={connectors} />
            <PaletteItem label="Progress bar" component={RevealProgressBar} connectors={connectors} />
            <PaletteItem label="CTA button" component={RevealCtaButton} connectors={connectors} />
            <PaletteItem label="Image" component={RevealImage} connectors={connectors} />
          </div>
          <p className="mt-3 text-[10px] leading-tight text-gray-400">
            Drag an item onto the canvas. Then drag the placed block to position it, or use the right panel for fine control.
          </p>
        </aside>

        {/* Canvas */}
        <main className="flex flex-1 items-center justify-center overflow-auto bg-gray-900 p-6">
          {hydrated && (
            <Frame>
              {initialJson ? null : (
                <Element is={RevealCanvas} canvas bgImage="" width={480} aspectRatio="4 / 5" bgColor="#1a1a2e" />
              )}
            </Frame>
          )}
        </main>

        {/* Settings */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-700 bg-white">
          {selected?.settings ? (
            <div>
              <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                {selected.name || 'Selected'}
              </div>
              {/* Craft.js mounts the related settings component automatically
                  when we render it here. */}
              <selected.settings />
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500">
              Select an element to edit its properties.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

function PaletteItem({ label, component, connectors }: {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: UserComponent<any>
  connectors: ReturnType<typeof useEditor>['connectors']
}) {
  return (
    <div
      ref={(ref) => {
        if (ref) {
          // Cast: Craft.js's Element types want full prop sets at the
          // call site, but here we rely on `.craft.props` defaults to
          // fill everything in when the node is created.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          connectors.create(ref, <Element is={component as any} />)
        }
      }}
      className="flex cursor-grab items-center gap-2 rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-100 hover:bg-gray-600 active:cursor-grabbing"
    >
      <Plus size={12} />
      <span>{label}</span>
    </div>
  )
}
