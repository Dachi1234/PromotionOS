'use client'

/**
 * <Money> — animated currency readout. Thin composition of <CountUp>
 * + `formatMoney` so widgets don't need to know about Intl directly.
 *
 * Usage:
 *   <Money amount={player.coins} currency="GEL" locale="ka" />
 *   <Money amount={pool} currency="USD" abbreviated />  // "$12.5K"
 */

import { CountUp } from './count-up'
import { formatMoney, formatMoneyAbbreviated } from '@/lib/format'

export interface MoneyProps {
  amount: number
  currency?: string
  locale?: string
  /** Render compact notation (`$12.5K`). */
  abbreviated?: boolean
  /** Skip the count-up animation and render a static span. Cheaper when
   *  the value isn't changing and you don't need motion. */
  animate?: boolean
  /** Passed through to `Intl.NumberFormat`. */
  options?: Intl.NumberFormatOptions
  className?: string
}

export function Money({
  amount,
  currency = 'USD',
  locale = 'en',
  abbreviated = false,
  animate = true,
  options,
  className,
}: MoneyProps): React.JSX.Element {
  const format = (n: number): string =>
    abbreviated
      ? formatMoneyAbbreviated(n, currency, locale)
      : formatMoney(n, currency, locale, options)

  if (!animate) {
    return <span className={className}>{format(amount)}</span>
  }

  return <CountUp value={amount} format={format} className={className} />
}
