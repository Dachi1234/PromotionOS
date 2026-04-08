'use client'

import { useNode } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'

const WIDGET_TO_MECHANIC_TYPES: Record<string, string[]> = {
  WHEEL: ['WHEEL', 'WHEEL_IN_WHEEL'],
  LEADERBOARD: ['LEADERBOARD', 'LEADERBOARD_LAYERED'],
  MISSION: ['MISSION'],
  PROGRESS_BAR: ['PROGRESS_BAR'],
  CASHOUT: ['CASHOUT'],
}

interface MechanicPickerProps {
  widgetType: string
}

export function MechanicPicker({ widgetType }: MechanicPickerProps) {
  const { actions: { setProp }, mechanicId } = useNode((n) => ({
    mechanicId: (n.data.props as { mechanicId?: string }).mechanicId ?? '',
  }))
  const builderMechanics = useCanvasStore((s) => s.builderMechanics)

  const allowedTypes = WIDGET_TO_MECHANIC_TYPES[widgetType] ?? []
  const filtered = allowedTypes.length > 0
    ? builderMechanics.filter((m) => allowedTypes.includes(m.type))
    : builderMechanics

  return (
    <div>
      <label className="block text-xs font-medium mb-1">Bound Mechanic</label>
      {filtered.length === 0 ? (
        <div className="text-xs text-gray-400 italic py-1">
          No {widgetType.replace(/_/g, ' ').toLowerCase()} mechanics configured yet.
          Add them in wizard steps 3-5.
        </div>
      ) : (
        <select
          value={mechanicId}
          onChange={(e) => setProp((p: { mechanicId: string }) => { p.mechanicId = e.target.value })}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-200"
        >
          <option value="">— Select mechanic —</option>
          {filtered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label || m.type} ({m.rewards.length} reward{m.rewards.length !== 1 ? 's' : ''})
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
