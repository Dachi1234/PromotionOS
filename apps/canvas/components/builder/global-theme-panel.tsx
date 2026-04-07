'use client'

import { useCanvasStore } from '@/stores/canvas-store'

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Fredoka', value: 'Fredoka, sans-serif' },
]

const RADIUS_OPTIONS = [
  { label: 'None', value: '0px' },
  { label: 'Subtle', value: '4px' },
  { label: 'Rounded', value: '8px' },
  { label: 'Pill', value: '16px' },
]

export function GlobalThemePanel() {
  const { theme, setTheme } = useCanvasStore()

  return (
    <div className="p-3 space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1">Primary Color</label>
        <input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ primaryColor: e.target.value })} className="h-8 w-full rounded" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Secondary Color</label>
        <input type="color" value={theme.secondaryColor} onChange={(e) => setTheme({ secondaryColor: e.target.value })} className="h-8 w-full rounded" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Background Color</label>
        <input type="color" value={theme.backgroundColor} onChange={(e) => setTheme({ backgroundColor: e.target.value })} className="h-8 w-full rounded" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Text Color</label>
        <input type="color" value={theme.textColor} onChange={(e) => setTheme({ textColor: e.target.value })} className="h-8 w-full rounded" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Font Family</label>
        <select value={theme.fontFamily} onChange={(e) => setTheme({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
          {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Border Radius</label>
        <div className="grid grid-cols-2 gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => setTheme({ borderRadius: r.value })} className={`rounded border px-2 py-1 text-xs ${theme.borderRadius === r.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Card Background</label>
        <input type="color" value={theme.cardBg} onChange={(e) => setTheme({ cardBg: e.target.value })} className="h-8 w-full rounded" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Card Border</label>
        <input type="color" value={theme.cardBorder} onChange={(e) => setTheme({ cardBorder: e.target.value })} className="h-8 w-full rounded" />
      </div>
    </div>
  )
}
