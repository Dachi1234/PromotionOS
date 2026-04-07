'use client'

import { useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useWizardStore, type WizardDependency } from '@/stores/wizard-store'

export function DependencyGraph() {
  const store = useWizardStore()

  const initialNodes: Node[] = store.mechanics.map((m, i) => ({
    id: m.id,
    position: { x: (i % 3) * 220, y: Math.floor(i / 3) * 120 },
    data: { label: `${m.label} (${m.type})` },
    style: {
      background: 'hsl(215 28% 17%)',
      color: 'hsl(210 20% 98%)',
      border: '1px solid hsl(215 28% 25%)',
      borderRadius: '8px',
      padding: '8px 16px',
      fontSize: '12px',
    },
  }))

  const initialEdges: Edge[] = store.dependencies.map((d) => ({
    id: d.id,
    source: d.parentMechanicId,
    target: d.childMechanicId,
    label: 'unlocks',
    labelStyle: { fontSize: 10, fill: 'hsl(218 11% 65%)' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(263 70% 50%)' },
    style: { stroke: 'hsl(263 70% 50%)' },
    animated: true,
  }))

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return
      if (store.dependencies.some((d) => d.parentMechanicId === connection.source && d.childMechanicId === connection.target)) return

      const dep: WizardDependency = {
        id: `dep-${Date.now()}`,
        parentMechanicId: connection.source,
        childMechanicId: connection.target,
        unlockCondition: { type: 'mechanic_complete' },
      }
      store.addDependency(dep)
      setEdges((eds) => addEdge({ ...connection, id: dep.id, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(263 70% 50%)' }, style: { stroke: 'hsl(263 70% 50%)' } }, eds))
    },
    [store, setEdges],
  )

  if (store.mechanics.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Add at least 2 mechanics to create dependencies
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border" style={{ height: 300 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(215 28% 25%)" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
