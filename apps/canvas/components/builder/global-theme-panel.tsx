'use client'

import { useCanvasStore } from '@/stores/canvas-store'
import { THEMES, type ThemeId } from '@/lib/themes'
import { Check } from 'lucide-react'

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
  const { theme, setTheme, themeId, setThemeId } = useCanvasStore()

  return (
    <div className="p-3 space-y-4">
      {/* Token-driven theme selector. Picks a named bundle from
          `lib/themes.ts` — ThemeApplier writes `data-theme` on the root so
          every template immediately recolours. The individual hex pickers
          below still let operators override specific tokens. */}
      <div>
        <label className="block text-xs font-medium mb-2">Campaign Theme</label>
        <div className="grid grid-cols-1 gap-1.5">
          {THEMES.map((t) => {
            const isActive = themeId === t.id
            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id as ThemeId)}
                className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-accent/40'
                }`}
              >
                <div className="flex gap-0.5" aria-hidden>
                  {t.swatch.map((hex, i) => (
                    <div
                      key={i}
                      className="w-3 h-5 rounded-sm border border-black/10"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {t.label}
                    {isActive && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {t.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <hr className="border-border" />

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
