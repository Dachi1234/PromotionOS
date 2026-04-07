'use client'

import { useNode, type UserComponent } from '@craftjs/core'

interface ImageProps {
  src: string
  alt: string
  linkUrl: string
  borderRadius: number
  objectFit: 'cover' | 'contain'
  maxWidth: number
}

export const ImageBlock: UserComponent<ImageProps> = ({ src, alt, linkUrl, borderRadius, objectFit, maxWidth }) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const imgEl = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || 'https://placehold.co/600x300/1e293b/94a3b8?text=Image'}
      alt={alt}
      style={{ width: '100%', borderRadius, objectFit, maxWidth, margin: '0 auto', display: 'block' }}
    />
  )
  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={`py-2 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {linkUrl ? <a href={linkUrl} target="_blank" rel="noopener noreferrer">{imgEl}</a> : imgEl}
    </div>
  )
}

function ImageSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as ImageProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Image URL</label>
      <input value={props.src} onChange={(e) => setProp((p: ImageProps) => { p.src = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Alt Text</label>
      <input value={props.alt} onChange={(e) => setProp((p: ImageProps) => { p.alt = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Link URL</label>
      <input value={props.linkUrl} onChange={(e) => setProp((p: ImageProps) => { p.linkUrl = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Border Radius (px)</label>
      <input type="number" value={props.borderRadius} onChange={(e) => setProp((p: ImageProps) => { p.borderRadius = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Max Width (px)</label>
      <input type="number" value={props.maxWidth} onChange={(e) => setProp((p: ImageProps) => { p.maxWidth = Number(e.target.value) })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  )
}

ImageBlock.craft = {
  displayName: 'Image',
  props: { src: '', alt: 'Image', linkUrl: '', borderRadius: 8, objectFit: 'cover', maxWidth: 600 },
  related: { settings: ImageSettings },
}
