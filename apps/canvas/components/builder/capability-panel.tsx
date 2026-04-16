'use client'

/**
 * Operator-facing capability breakdown.
 *
 * Renders under the MechanicPicker in each widget's settings panel so a
 * campaign operator can see, at a glance:
 *   • which engine-consumed options this mechanic supports, and
 *   • which option paths the wizard may render as "preview only".
 *
 * This is a pure projection of `MECHANIC_CAPABILITIES` — no hooks on the
 * engine side, no React Query. Keeping it zero-coupling lets us iterate
 * on copy without worrying about UI regressions.
 */

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

interface Props {
  widgetType: string
}

export function CapabilityPanel({ widgetType }: Props): React.JSX.Element | null {
  const { mechanicId } = useNode((n) => ({
    mechanicId: (n.data.props as { mechanicId?: string }).mechanicId ?? '',
  }))
  const builderMechanics = useCanvasStore((s) => s.builderMechanics)

  const allowedTypes = WIDGET_TO_MECHANIC_TYPES[widgetType] ?? []
  const selected = builderMechanics.find(
    (m) => m.id === mechanicId && (allowedTypes.length === 0 || allowedTypes.includes(m.type as MechanicType)),
  )
  if (!selected) return null

  const type = selected.type as MechanicType
  const cap = MECHANIC_CAPABILITIES[type]
  if (!cap) return null

  return (
    <details className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-xs text-gray-300">
      <summary className="cursor-pointer font-medium text-gray-200 marker:text-gray-500">
        Mechanic capabilities
      </summary>
      <div className="mt-2 space-y-3">
        <p className="text-gray-400 leading-snug">{cap.summary}</p>

        <div>
          <div className="font-semibold uppercase tracking-wider text-[10px] text-gray-500 mb-1">
            Supported
          </div>
          <ul className="space-y-0.5">
            {cap.supported.map((path) => (
              <li key={path} className="font-mono text-[11px] text-emerald-300/90">
                • {path}
              </li>
            ))}
          </ul>
        </div>

        {cap.experimental.length > 0 && (
          <div>
            <div className="font-semibold uppercase tracking-wider text-[10px] text-gray-500 mb-1 flex items-center gap-2">
              Preview-only <ExperimentalBadge label="Preview" />
            </div>
            <ul className="space-y-0.5">
              {cap.experimental.map((path) => (
                <li key={path} className="font-mono text-[11px] text-amber-300/80">
                  • {path}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}
