'use client'

import { useEditor } from '@craftjs/core'
import React from 'react'

export function SettingsPanel({ globalThemePanel }: { globalThemePanel: React.ReactNode }) {
  const { selected, relatedSettings } = useEditor((state) => {
    const currentNodeId = state.events.selected.values().next().value
    if (currentNodeId) {
      const node = state.nodes[currentNodeId]
      return {
        selected: currentNodeId,
        relatedSettings: node?.related?.settings,
      }
    }
    return { selected: null, relatedSettings: undefined }
  })

  return (
    <div className="w-64 border-l border-border bg-card h-full overflow-y-auto">
      {selected && relatedSettings ? (
        <div>
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Block Settings</h3>
          </div>
          {React.createElement(relatedSettings)}
        </div>
      ) : (
        <div>
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Global Theme</h3>
          </div>
          {globalThemePanel}
        </div>
      )}
    </div>
  )
}
