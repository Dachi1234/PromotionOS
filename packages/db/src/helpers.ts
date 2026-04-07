import { timestamp } from 'drizzle-orm/pg-core'

/**
 * Shorthand for `timestamp(name, { withTimezone: true, mode: 'date' })`.
 * Drizzle does not export a standalone `timestamptz` helper — this provides parity.
 */
export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' })
