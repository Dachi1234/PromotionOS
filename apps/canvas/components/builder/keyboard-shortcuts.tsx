'use client'

import { useEffect } from 'react'
import { useEditor } from '@craftjs/core'

/**
 * Global keyboard shortcuts for the canvas editor. Mount once inside
 * `<Editor>`. Handles:
 *   - Del / Backspace: delete currently selected node (root is protected
 *     by Craft.js's own `canDrag: false` rule)
 *   - Cmd/Ctrl+Z: undo
 *   - Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: redo
 *   - Cmd/Ctrl+D: duplicate selected node (inserts after original, mirrors
 *     the Duplicate button in the right rail)
 *
 * Ignores events originating from form controls so typing in the
 * settings-panel inputs never nukes the selected block.
 */
export function KeyboardShortcuts() {
  const { actions, query } = useEditor()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (t && t.isContentEditable)
      if (isEditable) return

      const meta = e.metaKey || e.ctrlKey

      if (!meta && (e.key === 'Delete' || e.key === 'Backspace')) {
        const state = query.getState()
        const selectedId = state.events.selected.values().next().value
        if (!selectedId || selectedId === 'ROOT') return
        // Craft.js throws if the node isn't deletable — swallow so the
        // shortcut silently no-ops instead of crashing the app.
        try { actions.delete(selectedId) } catch { /* not deletable */ }
        e.preventDefault()
        return
      }

      if (meta && !e.shiftKey && e.key.toLowerCase() === 'z') {
        actions.history.undo()
        e.preventDefault()
        return
      }
      if ((meta && e.shiftKey && e.key.toLowerCase() === 'z') ||
          (meta && e.key.toLowerCase() === 'y')) {
        actions.history.redo()
        e.preventDefault()
        return
      }

      if (meta && e.key.toLowerCase() === 'd') {
        // Duplicate. Same semantics as the right-rail Copy button:
        // serialise the selected subtree and re-add it next to the
        // original. Skip ROOT (can't duplicate the canvas itself) and
        // any orphan nodes.
        const state = query.getState()
        const selectedId = state.events.selected.values().next().value
        if (!selectedId || selectedId === 'ROOT') return
        const node = state.nodes[selectedId]
        const parent = node?.data?.parent
        if (!parent) return
        try {
          const siblings = state.nodes[parent]?.data?.nodes ?? []
          const idx = siblings.indexOf(selectedId)
          const insertAt = idx >= 0 ? idx + 1 : siblings.length
          const tree = query.node(selectedId).toNodeTree()
          actions.addNodeTree(tree, parent, insertAt)
        } catch { /* non-clonable node — ignore */ }
        e.preventDefault()
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, query])

  return null
}
