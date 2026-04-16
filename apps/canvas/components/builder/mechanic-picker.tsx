'use client'

import { useNode } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'
import {
  MECHANIC_CAPABILITIES,
  type MechanicType,
} from '@/lib/mechanic-capabilities'
import { ExperimentalBadge } from '@/components/shared/widget-state'

const WIDGET_TO_MECHANIC_TYPES: Record<string, MechanicType[]> = {
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
    ? builderMechanics.filter((m) => allowedTypes.includes(m.type as MechanicType))
    : builderMechanics

  // Look up the currently-bound mechanic so we can surface its capability
  // summary (from MECHANIC_CAPABILITIES) right under the picker. This helps
  // operators remember what the mechanic actually does — especially when
  // they're juggling several in one campaign.
  const selectedMechanic = filtered.find((m) => m.id === mechanicId)
  const selectedType = selectedMechanic?.type as MechanicType | undefined
  const capability = selectedType ? MECHANIC_CAPABILITIES[selectedType] : null

  // WHEEL_IN_WHEEL and LEADERBOARD_LAYERED are newer variants that a lot of
  // experimental option paths hang off — mark them so operators know the
  // fine-grained config may be "preview only" when they configure in Studio.
  const isNovelVariant = selectedType === 'WHEEL_IN_WHEEL' || selectedType === 'LEADERBOARD_LAYERED'

  return (
    <div>
      <label className="block text-xs font-medium mb-1">Bound Mechanic</label>
      {filtered.length === 0 ? (
        <div className="text-xs text-gray-400 italic py-1">
          No {widgetType.replace(/_/g, ' ').toLowerCase()} mechanics configured yet.
          Add them in wizard steps 3-5.
        </div>
      ) : (
        <>
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
          {capability && (
            <div className="mt-2 flex items-start gap-2">
              <p className="text-[11px] leading-snug text-gray-400 flex-1">
                {capability.summary}
              </p>
              {isNovelVariant && <ExperimentalBadge />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
