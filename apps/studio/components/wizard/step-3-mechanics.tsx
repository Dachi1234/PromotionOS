'use client'

import { useCallback, useState } from 'react'
import { Trash2, GripVertical, Dices, Trophy, Target, BarChart3, Coins, Gift, Settings2 } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWizardStore, type WizardMechanic, type MechanicType } from '@/stores/wizard-store'
import { MechanicConfigDrawer } from './mechanic-config-drawer'
import { DependencyGraph } from './dependency-graph'

const MECHANIC_CATALOG: { type: MechanicType; label: string; description: string; icon: typeof Dices }[] = [
  { type: 'WHEEL', label: 'Wheel', description: 'A spin-the-wheel game. Players tap to spin and win prizes based on where the wheel lands. You configure the prize slices and win probabilities.', icon: Dices },
  { type: 'WHEEL_IN_WHEEL', label: 'Wheel-in-Wheel', description: 'A two-layer wheel where some slices unlock a second inner wheel. Use this for tiered prizes where players must complete conditions to access bigger rewards.', icon: Dices },
  { type: 'LEADERBOARD', label: 'Leaderboard', description: 'A ranking board that shows top players based on activity (bets, deposits, etc.). Great for competitive promotions.', icon: Trophy },
  { type: 'LEADERBOARD_LAYERED', label: 'Layered Leaderboard', description: 'Two leaderboards connected by a coin system. Players earn coins on the first board to unlock access to an exclusive second board.', icon: Trophy },
  { type: 'MISSION', label: 'Mission', description: 'A series of tasks/challenges players must complete in order (or in parallel). Each step can have its own reward.', icon: Target },
  { type: 'PROGRESS_BAR', label: 'Progress Bar', description: 'A visual progress tracker. Players fill the bar by accumulating activity (e.g., total bets). When full, they unlock a reward.', icon: BarChart3 },
  { type: 'CASHOUT', label: 'Cashout', description: 'A conditional reward claim. Players can collect a reward once they meet specific conditions (e.g., minimum wagering).', icon: Coins },
]

function SortableMechanicItem({ mechanic, onConfigure, onRemove }: { mechanic: WizardMechanic; onConfigure: () => void; onRemove: () => void }) {
  const store = useWizardStore()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mechanic.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border border-border p-3">
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <input
          type="text"
          value={mechanic.label}
          onChange={(e) => store.updateMechanic(mechanic.id, { label: e.target.value })}
          className="bg-transparent text-sm font-medium outline-none w-full"
        />
        <p className="text-xs text-muted-foreground">{mechanic.type}</p>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={mechanic.isActive}
          onChange={(e) => store.updateMechanic(mechanic.id, { isActive: e.target.checked })}
          className="rounded"
        />
        Active
      </label>
      <button onClick={onConfigure} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        <Settings2 className="h-4 w-4" />
      </button>
      <button onClick={onRemove} className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function Step3Mechanics() {
  const store = useWizardStore()
  const [configDrawerId, setConfigDrawerId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const sorted = [...store.mechanics].sort((a, b) => a.displayOrder - b.displayOrder)
    const oldIndex = sorted.findIndex((m) => m.id === active.id)
    const newIndex = sorted.findIndex((m) => m.id === over.id)
    const ids = sorted.map((m) => m.id)
    const [removed] = ids.splice(oldIndex, 1)
    ids.splice(newIndex, 0, removed)
    store.reorderMechanics(ids)
  }, [store])

  const addMechanic = useCallback((type: MechanicType) => {
    const catalog = MECHANIC_CATALOG.find((c) => c.type === type)
    if (!catalog) return

    const mechanic: WizardMechanic = {
      id: `mech-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: catalog.label,
      config: {},
      displayOrder: store.mechanics.length,
      isActive: true,
      triggers: [],
      aggregationRules: [],
      rewardDefinitions: [],
    }
    store.addMechanic(mechanic)
  }, [store])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mechanics</h2>
        <p className="text-sm text-muted-foreground">Add promotion mechanics from the catalog</p>
      </div>

      <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-sm">
        <p className="font-medium text-blue-400">How mechanics work</p>
        <p className="text-muted-foreground mt-1">Click any mechanic type to add it to your campaign. You can add multiple mechanics — for example, a Wheel + Leaderboard. After adding, click the ⚙️ gear icon to configure each one.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {MECHANIC_CATALOG.map((item) => (
          <button
            key={item.type}
            onClick={() => addMechanic(item.type)}
            className="rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <item.icon className="h-6 w-6 text-primary mb-2" />
            <p className="font-medium text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
          </button>
        ))}
      </div>

      {store.mechanics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Added Mechanics ({store.mechanics.length})</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={store.mechanics.sort((a, b) => a.displayOrder - b.displayOrder).map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {[...store.mechanics]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((mech) => (
                  <SortableMechanicItem
                    key={mech.id}
                    mechanic={mech}
                    onConfigure={() => setConfigDrawerId(mech.id)}
                    onRemove={() => store.removeMechanic(mech.id)}
                  />
                ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {store.mechanics.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click a mechanic type above to add it to your campaign</p>
        </div>
      )}

      {store.mechanics.length >= 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Dependencies</h3>
          <p className="text-xs text-muted-foreground">Draw edges between mechanics to create unlock dependencies</p>
          <DependencyGraph />
        </div>
      )}

      {configDrawerId && (() => {
        const mech = store.mechanics.find((m) => m.id === configDrawerId)
        return mech ? <MechanicConfigDrawer mechanic={mech} onClose={() => setConfigDrawerId(null)} /> : null
      })()}
    </div>
  )
}
