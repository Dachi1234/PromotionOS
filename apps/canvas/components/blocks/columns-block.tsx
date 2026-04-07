'use client'

import { useNode, Element, type UserComponent } from '@craftjs/core'

interface ColumnsProps {
  columns: number
  gap: number
  stackOnMobile: boolean
}

export const ColumnDropZone: UserComponent = ({ children }) => {
  const { connectors: { connect } } = useNode()
  return (
    <div ref={(ref) => { if (ref) connect(ref) }} className="min-h-[60px] rounded border border-dashed border-gray-400/30 p-2">
      {children}
    </div>
  )
}

ColumnDropZone.craft = { displayName: 'Column', rules: { canDrag: () => false } }

export const ColumnsBlock: UserComponent<ColumnsProps> = ({ columns, gap, stackOnMobile }) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={`py-2 px-4 ${selected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div
        className={stackOnMobile ? 'flex flex-col md:flex-row' : 'flex flex-row'}
        style={{ gap }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} style={{ flex: 1 }}>
            <Element id={`column-${i}`} is={ColumnDropZone} canvas />
          </div>
        ))}
      </div>
    </div>
  )
}

function ColumnsSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as ColumnsProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Columns</label>
      <select value={props.columns} onChange={(e) => setProp((p: ColumnsProps) => { p.columns = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value={2}>2 Columns</option><option value={3}>3 Columns</option><option value={4}>4 Columns</option>
      </select>
      <label className="block text-xs font-medium">Gap (px)</label>
      <input type="number" value={props.gap} onChange={(e) => setProp((p: ColumnsProps) => { p.gap = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={props.stackOnMobile} onChange={(e) => setProp((p: ColumnsProps) => { p.stackOnMobile = e.target.checked })} /> Stack on Mobile
      </label>
    </div>
  )
}

ColumnsBlock.craft = {
  displayName: 'Columns',
  props: { columns: 2, gap: 16, stackOnMobile: true },
  related: { settings: ColumnsSettings },
}
