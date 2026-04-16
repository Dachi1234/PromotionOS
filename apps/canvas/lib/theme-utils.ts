/**
 * Theme token helpers for classic/modern/neon templates.
 *
 * The luxe template family reads CSS tokens directly. The older families
 * historically took bgColor/accentColor/textColor props (hex) from the
 * widget settings panel. That means operators who switch the campaign
 * theme won't see those templates recolor — the hex wins.
 *
 * These helpers fix that asymmetry: each template's canonical fallback
 * hex lives here. If the incoming prop matches the canonical default we
 * assume the operator hasn't customised, and we return a CSS-token
 * reference instead. If they *did* pick a custom colour we respect it.
 *
 * Usage:
 *   const bg = resolveBg(bgColor, 'classic')   // '#1a1a2e' → 'hsl(var(--background))'
 *   const fg = resolveText(textColor, 'classic')
 *   const accent = resolveAccent(accentColor, 'classic')
 */

type Family = 'classic' | 'modern' | 'neon'

// These hex values match the `.craft.props` defaults emitted by the
// widgets. Kept centralised so a widget's default stays in sync with
// whatever the template treats as "theme-eligible".
const DEFAULTS: Record<Family, { bg: string[]; text: string[]; accent: string[] }> = {
  classic: {
    bg: ['#1a1a2e'],
    text: ['#ffffff', '#fff'],
    accent: ['#7c3aed', '#22c55e', '#f59e0b'],
  },
  modern: {
    bg: ['#f8fafc', '#ffffff', '#fff'],
    text: ['#0f172a', '#1e293b'],
    accent: ['#7c3aed', '#2563eb'],
  },
  neon: {
    bg: ['#0a0a0f', '#050510'],
    text: ['#ffffff', '#fff'],
    accent: ['#06b6d4', '#d946ef'],
  },
}

function normalize(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase()
}

/** Return the CSS-token background for a given family, or the operator's
 *  customised value if they've picked one. */
export function resolveBg(bgColor: string | undefined, family: Family): string {
  const defaults = DEFAULTS[family].bg
  if (!bgColor || defaults.includes(normalize(bgColor))) {
    return 'hsl(var(--background))'
  }
  return bgColor
}

/** Return the CSS-token foreground (body text), falling back to the prop
 *  when the operator has customised. */
export function resolveText(textColor: string | undefined, family: Family): string {
  const defaults = DEFAULTS[family].text
  if (!textColor || defaults.includes(normalize(textColor))) {
    return 'hsl(var(--foreground))'
  }
  return textColor
}

/** Return the CSS-token accent colour, falling back to the prop when
 *  the operator has customised. */
export function resolveAccent(accentColor: string | undefined, family: Family): string {
  const defaults = DEFAULTS[family].accent
  if (!accentColor || defaults.includes(normalize(accentColor))) {
    return 'hsl(var(--primary))'
  }
  return accentColor
}

/** Convenience bundle — call once and destructure. */
export function resolveTemplateColors(
  { bgColor, textColor, accentColor }: { bgColor?: string; textColor?: string; accentColor?: string },
  family: Family,
): { bg: string; text: string; accent: string } {
  return {
    bg: resolveBg(bgColor, family),
    text: resolveText(textColor, family),
    accent: resolveAccent(accentColor, family),
  }
}
