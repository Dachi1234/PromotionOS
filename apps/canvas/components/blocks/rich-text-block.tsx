'use client'

import { useNode, type UserComponent } from '@craftjs/core'

interface RichTextProps {
  content: string
  alignment: 'left' | 'center' | 'right'
  maxWidth: number
}

export const RichTextBlock: UserComponent<RichTextProps> = ({ content, alignment, maxWidth }) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={`py-4 px-6 ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ textAlign: alignment, maxWidth, margin: '0 auto' }}
      dangerouslySetInnerHTML={{ __html: content || '<p>Enter your text here...</p>' }}
    />
  )
}

function RichTextSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as RichTextProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Content (HTML)</label>
      <textarea value={props.content} onChange={(e) => setProp((p: RichTextProps) => { p.content = e.target.value })} rows={6} className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono" />
      <label className="block text-xs font-medium">Alignment</label>
      <select value={props.alignment} onChange={(e) => setProp((p: RichTextProps) => { p.alignment = e.target.value as RichTextProps['alignment'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select>
      <label className="block text-xs font-medium">Max Width (px)</label>
      <input type="number" value={props.maxWidth} onChange={(e) => setProp((p: RichTextProps) => { p.maxWidth = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  )
}

RichTextBlock.craft = {
  displayName: 'Rich Text',
  props: { content: '<p>Enter your text here...</p>', alignment: 'left', maxWidth: 800 },
  related: { settings: RichTextSettings },
}
