/**
 * Locale-aware formatting helpers built on `Intl.NumberFormat`.
 *
 * Centralised here so every widget renders money/points/rank deltas the
 * same way, and so we can swap in CLDR-specific rules (RTL, grouping,
 * currency positioning) without hunting through the component tree.
 *
 * All helpers are safe on the server — they do not touch DOM — and cache
 * formatter instances since `Intl.NumberFormat` construction is hot.
 */

type FormatterKey = string

const numberCache = new Map<FormatterKey, Intl.NumberFormat>()
const moneyCache = new Map<FormatterKey, Intl.NumberFormat>()

function getNumberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}::${JSON.stringify(options)}`
  let fmt = numberCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options)
    numberCache.set(key, fmt)
  }
  return fmt
}

function getMoneyFormatter(locale: string, currency: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}::${currency}::${JSON.stringify(options)}`
  let fmt = moneyCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, ...options })
    moneyCache.set(key, fmt)
  }
  return fmt
}

/**
 * `formatNumber(1234567, 'en')` → `"1,234,567"`.
 * `formatNumber(1234567, 'ka')` → `"1 234 567"` (Georgian grouping).
 */
export function formatNumber(n: number, locale: string = 'en', options?: Intl.NumberFormatOptions): string {
  return getNumberFormatter(locale, options ?? {}).format(n)
}

/**
 * Short-form abbreviation — `12_500 → "12.5K"`, `3_200_000 → "3.2M"`.
 * Uses `notation: 'compact'` which Intl resolves per-locale.
 *
 * Pass `maximumFractionDigits` to tune precision (default 1).
 */
export function formatAbbreviated(n: number, locale: string = 'en', maximumFractionDigits = 1): string {
  return getNumberFormatter(locale, {
    notation: 'compact',
    maximumFractionDigits,
  }).format(n)
}

/**
 * `formatMoney(1234.5, 'GEL', 'ka')` → `"1 234,50 ₾"`.
 * `formatMoney(1234.5, 'USD', 'en')` → `"$1,234.50"`.
 *
 * Defaults to 2 fraction digits; pass `0` for round-number points-like
 * displays (`formatMoney(10, 'USD', 'en', { maximumFractionDigits: 0 })`).
 */
export function formatMoney(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en',
  options?: Intl.NumberFormatOptions,
): string {
  return getMoneyFormatter(locale, currency, options ?? {}).format(amount)
}

/**
 * Abbreviated currency — `formatMoneyAbbreviated(12_500, 'USD', 'en')`
 * → `"$12.5K"`. Useful for leaderboard prize pools and progress-bar
 * targets where exact cents are noise.
 */
export function formatMoneyAbbreviated(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en',
  maximumFractionDigits = 1,
): string {
  return getMoneyFormatter(locale, currency, {
    notation: 'compact',
    maximumFractionDigits,
  }).format(amount)
}

/**
 * `formatPercent(0.42)` → `"42%"`. Accepts a fraction (0..1).
 */
export function formatPercent(fraction: number, locale: string = 'en', maximumFractionDigits = 0): string {
  return getNumberFormatter(locale, {
    style: 'percent',
    maximumFractionDigits,
  }).format(fraction)
}

/**
 * `formatOrdinal(1, 'en')` → `"1st"`, `formatOrdinal(2, 'en')` → `"2nd"`.
 * Uses `Intl.PluralRules` — falls back to the number as string on locales
 * that don't have ordinal plural categories.
 */
export function formatOrdinal(n: number, locale: string = 'en'): string {
  try {
    const pr = new Intl.PluralRules(locale, { type: 'ordinal' })
    const category = pr.select(n)
    const suffixes: Record<string, string> = locale.startsWith('en')
      ? { one: 'st', two: 'nd', few: 'rd', other: 'th' }
      : { one: '', two: '', few: '', other: '' }
    return `${n}${suffixes[category] ?? ''}`
  } catch {
    return String(n)
  }
}
