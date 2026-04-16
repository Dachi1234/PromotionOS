/**
 * Theme catalog for the canvas.
 *
 * Each theme is a named bundle of CSS variables defined in `app/globals.css`
 * under a `[data-theme="<id>"]` selector. To pick a theme at runtime, set
 * `data-theme` on the document root (or any wrapping element) — all descendant
 * templates and widgets automatically re-colour.
 *
 * New themes:
 *   1. Define the `[data-theme="foo"]` block in `globals.css`.
 *   2. Add a `ThemeDescriptor` entry here.
 *   3. The Studio theme-picker reads from `THEMES` — no wiring needed.
 *
 * Do NOT hardcode colour values outside `globals.css`. Widgets should only
 * reference tokens (`hsl(var(--primary))`, `var(--gradient-hero)` etc.).
 */

export type ThemeId = 'clean' | 'casino-lux' | 'playful' | 'esports' | 'seasonal-xmas'

export interface ThemeDescriptor {
  id: ThemeId
  label: string
  description: string
  /** Three hex swatches for the Studio preview chip — order matters:
   *  [surface, primary, accent]. Used purely for the picker UI. */
  swatch: [string, string, string]
  /** Tone hint: whether this theme is inherently light or dark so the
   *  Studio preview frame can match without an extra query. */
  tone: 'light' | 'dark'
  /** Personality tag; the Studio filter uses these. */
  tags: Array<'modern' | 'premium' | 'playful' | 'sport' | 'minimal' | 'seasonal'>
}

export const THEMES: ThemeDescriptor[] = [
  {
    id: 'clean',
    label: 'Clean',
    description: 'Neutral, operator-safe default. Pairs with any brand.',
    swatch: ['#F7F8FA', '#7C3AED', '#7C3AED'],
    tone: 'light',
    tags: ['modern', 'minimal'],
  },
  {
    id: 'casino-lux',
    label: 'Casino Lux',
    description: 'Deep jewel tones with gold accents — premium lounge feel.',
    swatch: ['#14142B', '#E0B23A', '#991B3B'],
    tone: 'dark',
    tags: ['premium', 'modern'],
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Bright, rounded, bouncy — mass-market mobile energy.',
    swatch: ['#F0F9FF', '#EC4899', '#F97316'],
    tone: 'light',
    tags: ['playful', 'modern'],
  },
  {
    id: 'esports',
    label: 'Esports',
    description: 'High-contrast cyan/violet with sharp edges. Sportsbook vibes.',
    swatch: ['#111827', '#14B8A6', '#8B5CF6'],
    tone: 'dark',
    tags: ['sport', 'modern'],
  },
  {
    id: 'seasonal-xmas',
    label: 'Seasonal — Holiday',
    description: 'Holly red, pine green, gold. Warm seasonal palette for end-of-year drops.',
    swatch: ['#2a0808', '#C82020', '#E6B800'],
    tone: 'dark',
    tags: ['seasonal', 'premium'],
  },
]

export const DEFAULT_THEME: ThemeId = 'clean'

export function getTheme(id: string | undefined | null): ThemeDescriptor {
  if (!id) return THEMES[0]!
  const match = THEMES.find((t) => t.id === id)
  return match ?? THEMES[0]!
}

export function isValidThemeId(id: string): id is ThemeId {
  return THEMES.some((t) => t.id === id)
}
