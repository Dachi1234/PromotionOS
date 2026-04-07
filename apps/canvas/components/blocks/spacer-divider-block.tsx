'use client'

import { useNode, type UserComponent } from '@craftjs/core'

interface SpacerProps {
  height: number
  dividerStyle: 'none' | 'solid' | 'dashed' | 'dotted'
  dividerColor: string
  dividerWidth: number
}

export const SpacerDividerBlock: UserComponent<SpacerProps> = ({ height, dividerStyle, dividerColor, dividerWidth }) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={`flex items-center justify-center ${selected ? 'ring-2 ring-blue-500' : ''}`} style={{ height }}>
      {dividerStyle !== 'none' && (
        <hr style={{ borderStyle: dividerStyle, borderColor: dividerColor, width: `${dividerWidth}%`, borderWidth: '1px 0 0 0' }} />
      )}
    </div>
  )
}

function SpacerSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as SpacerProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Height (px)</label>
      <input type="number" value={props.height} onChange={(e) => setProp((p: SpacerProps) => { p.height = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Divider Style</label>
      <select value={props.dividerStyle} onChange={(e) => setProp((p: SpacerProps) => { p.dividerStyle = e.target.value as SpacerProps['dividerStyle'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
      </select>
      <label className="block text-xs font-medium">Color</label>
      <input type="color" value={props.dividerColor} onChange={(e) => setProp((p: SpacerProps) => { p.dividerColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Width (%)</label>
      <input type="number" value={props.dividerWidth} onChange={(e) => setProp((p: SpacerProps) => { p.dividerWidth = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" min={10} max={100} />
    </div>
  )
}

SpacerDividerBlock.craft = {
  displayName: 'Spacer / Divider',
  props: { height: 40, dividerStyle: 'none', dividerColor: '#475569', dividerWidth: 80 },
  related: { settings: SpacerSettings },
}
