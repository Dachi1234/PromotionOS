'use client'

import { useState, useEffect } from 'react'
import { useNode, type UserComponent } from '@craftjs/core'
import { useCanvasStore } from '@/stores/canvas-store'

interface CountdownProps {
  targetDate: string
  label: string
  accentColor: string
  textColor: string
  bgColor: string
}

function useCountdownTarget(targetDate: string, isBuilder: boolean) {
  return isBuilder && !targetDate
    ? new Date(Date.now() + 12 * 86400000 + 8 * 3600000 + 45 * 60000 + 30000).toISOString()
    : targetDate
}

function splitDiff(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 }
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return { d, h, m, s }
}

function pad(n: number) { return n.toString().padStart(2, '0') }

export const CountdownTimerBlock: UserComponent<CountdownProps> = (props) => {
  const { targetDate, label, accentColor, textColor, bgColor } = props
  const { connectors: { connect, drag }, selected } = useNode((n) => ({ selected: n.events.selected }))
  const isBuilder = useCanvasStore((s) => s.isBuilder)

  const effectiveTarget = useCountdownTarget(targetDate, isBuilder)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (isBuilder || !effectiveTarget) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [effectiveTarget, isBuilder])

  const diff = effectiveTarget ? new Date(effectiveTarget).getTime() - now : 0
  const { d, h, m, s } = splitDiff(diff)

  const GOLD = accentColor || '#D4AF37'
  const bg = bgColor || '#0B1220'
  const fg = textColor || '#E9EEF5'

  const cell = (value: string, suffix: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          color: GOLD,
          fontFamily: 'var(--font-display, Georgia, serif)',
          lineHeight: 1,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          marginTop: 6,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: 0.55,
          fontWeight: 700,
        }}
      >
        {suffix}
      </div>
    </div>
  )

  return (
    <div
      ref={(ref) => { if (ref) connect(drag(ref)) }}
      className={selected ? 'ring-2 ring-blue-500' : ''}
      style={{
        background: bg,
        color: fg,
        borderRadius: 10,
        border: `1px solid ${GOLD}40`,
        padding: '18px 22px',
        fontFamily: 'var(--font-display, system-ui)',
      }}
    >
      {(label || 'Ends in') && (
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.65,
            fontWeight: 700,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {label || 'Ends in'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
        {cell(d.toString(), 'Days')}
        <div style={{ color: GOLD, fontSize: 24, fontWeight: 900, opacity: 0.4 }}>:</div>
        {cell(pad(h), 'Hrs')}
        <div style={{ color: GOLD, fontSize: 24, fontWeight: 900, opacity: 0.4 }}>:</div>
        {cell(pad(m), 'Min')}
        <div style={{ color: GOLD, fontSize: 24, fontWeight: 900, opacity: 0.4 }}>:</div>
        {cell(pad(s), 'Sec')}
      </div>
    </div>
  )
}

function CountdownSettings() {
  const { actions: { setProp }, props } = useNode((n) => ({ props: n.data.props as CountdownProps }))
  return (
    <div className="space-y-3 p-3">
      <label className="block text-xs font-medium">Target Date</label>
      <input type="datetime-local" value={props.targetDate} onChange={(e) => setProp((p: CountdownProps) => { p.targetDate = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <label className="block text-xs font-medium">Label</label>
      <input value={props.label} onChange={(e) => setProp((p: CountdownProps) => { p.label = e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
      <hr className="border-gray-700" />
      <label className="block text-xs font-medium">Accent Color</label>
      <input type="color" value={props.accentColor || '#D4AF37'} onChange={(e) => setProp((p: CountdownProps) => { p.accentColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Text Color</label>
      <input type="color" value={props.textColor || '#E9EEF5'} onChange={(e) => setProp((p: CountdownProps) => { p.textColor = e.target.value })} className="h-8 w-full" />
      <label className="block text-xs font-medium">Background</label>
      <input type="color" value={props.bgColor || '#0B1220'} onChange={(e) => setProp((p: CountdownProps) => { p.bgColor = e.target.value })} className="h-8 w-full" />
    </div>
  )
}

CountdownTimerBlock.craft = {
  displayName: 'Countdown',
  props: {
    targetDate: '',
    label: 'Ends in',
    accentColor: '#D4AF37',
    textColor: '#E9EEF5',
    bgColor: '#0B1220',
  },
  related: { settings: CountdownSettings },
}
