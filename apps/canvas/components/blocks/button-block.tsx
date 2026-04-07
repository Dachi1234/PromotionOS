'use client'

import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'

interface ButtonProps {
  label: string
  actionType: 'link' | 'scroll' | 'opt-in'
  linkUrl: string
  targetMechanicId: string
  variant: 'filled' | 'outlined' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  fullWidth: boolean
}

export const ButtonBlock: UserComponent<ButtonProps> = ({ label, variant, size, fullWidth }) => {
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const theme = useCanvasStore((s) => s.theme)

  const sizeClasses = { sm: 'px-4 py-1.5 text-sm', md: 'px-6 py-2.5 text-base', lg: 'px-8 py-3.5 text-lg' }
  const variantStyles: Record<string, React.CSSProperties> = {
    filled: { backgroundColor: theme.primaryColor, color: '#fff' },
    outlined: { border: `2px solid ${theme.primaryColor}`, color: theme.primaryColor, background: 'transparent' },
    ghost: { color: theme.primaryColor, background: 'transparent' },
  }

  return (
    <div ref={(ref) => { if (ref) connect(drag(ref)) }} className={`py-3 px-6 ${fullWidth ? '' : 'text-center'} ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <button
        className={`rounded-lg font-semibold transition-opacity hover:opacity-90 ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''}`}
        style={{ ...variantStyles[variant], borderRadius: theme.borderRadius }}
      >
        {label || 'Click Me'}
      </button>
    </div>
  )
}

function ButtonSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as ButtonProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Label</label>
      <input value={props.label} onChange={(e) => setProp((p: ButtonProps) => { p.label = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Action</label>
      <select value={props.actionType} onChange={(e) => setProp((p: ButtonProps) => { p.actionType = e.target.value as ButtonProps['actionType'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="link">Link</option><option value="scroll">Scroll to Mechanic</option><option value="opt-in">Opt-In</option>
      </select>
      {props.actionType === 'link' && (
        <><label className="block text-xs font-medium">URL</label>
        <input value={props.linkUrl} onChange={(e) => setProp((p: ButtonProps) => { p.linkUrl = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></>
      )}
      <label className="block text-xs font-medium">Variant</label>
      <select value={props.variant} onChange={(e) => setProp((p: ButtonProps) => { p.variant = e.target.value as ButtonProps['variant'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="filled">Filled</option><option value="outlined">Outlined</option><option value="ghost">Ghost</option>
      </select>
      <label className="block text-xs font-medium">Size</label>
      <select value={props.size} onChange={(e) => setProp((p: ButtonProps) => { p.size = e.target.value as ButtonProps['size'] })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
        <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
      </select>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={props.fullWidth} onChange={(e) => setProp((p: ButtonProps) => { p.fullWidth = e.target.checked })} /> Full Width
      </label>
    </div>
  )
}

ButtonBlock.craft = {
  displayName: 'Button',
  props: { label: 'Click Me', actionType: 'link', linkUrl: '', targetMechanicId: '', variant: 'filled', size: 'md', fullWidth: false },
  related: { settings: ButtonSettings },
}
