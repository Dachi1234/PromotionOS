import { describe, it, expect } from 'vitest'
import { calculateWindowBounds } from '../window-calculator.service'

/**
 * Parity tests for `calculateWindowBounds`.
 *
 * The aggregator (writes stats keyed on windowStart) and the leaderboard
 * service / finalizer (reads stats keyed on windowStart) must independently
 * arrive at the same bucket boundary when given consistent inputs. If these
 * two paths disagree by even 1ms the write goes to one row and the read
 * misses it — this was the root cause fixed in Phase 1.3.
 *
 * These tests pin down the deterministic boundaries so any future rewrite
 * that breaks parity will fail loudly.
 */

const CAMPAIGN_STARTS = new Date('2026-04-01T00:00:00.000Z')
const CAMPAIGN_ENDS = new Date('2026-04-30T23:59:59.999Z')

describe('calculateWindowBounds — bucket boundaries', () => {
  it('campaign window is independent of reference time', () => {
    const earlyRef = new Date('2026-04-02T05:17:23.456Z')
    const lateRef = new Date('2026-04-29T23:14:00.000Z')

    const early = calculateWindowBounds('campaign', earlyRef, CAMPAIGN_STARTS, CAMPAIGN_ENDS)
    const late = calculateWindowBounds('campaign', lateRef, CAMPAIGN_STARTS, CAMPAIGN_ENDS)

    expect(early.windowStart.getTime()).toBe(CAMPAIGN_STARTS.getTime())
    expect(late.windowStart.getTime()).toBe(CAMPAIGN_STARTS.getTime())
    expect(early.windowEnd.getTime()).toBe(CAMPAIGN_ENDS.getTime())
  })

  it('campaign window throws without campaign dates', () => {
    const ref = new Date('2026-04-02T00:00:00.000Z')
    expect(() => calculateWindowBounds('campaign', ref)).toThrow(
      /campaign window requires/,
    )
  })

  it('daily window truncates to UTC midnight and spans exactly 24h', () => {
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const { windowStart, windowEnd } = calculateWindowBounds('daily', ref)

    expect(windowStart.toISOString()).toBe('2026-04-16T00:00:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-04-17T00:00:00.000Z')
    expect(windowEnd.getTime() - windowStart.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('daily window is stable across two refs in the same UTC day', () => {
    const a = calculateWindowBounds('daily', new Date('2026-04-16T00:00:00.001Z'))
    const b = calculateWindowBounds('daily', new Date('2026-04-16T23:59:59.999Z'))
    expect(a.windowStart.getTime()).toBe(b.windowStart.getTime())
  })

  it('daily window flips bucket exactly at UTC midnight', () => {
    const before = calculateWindowBounds('daily', new Date('2026-04-16T23:59:59.999Z'))
    const after = calculateWindowBounds('daily', new Date('2026-04-17T00:00:00.000Z'))
    expect(after.windowStart.getTime() - before.windowStart.getTime()).toBe(
      24 * 60 * 60 * 1000,
    )
  })

  it('hourly window truncates to the top of the hour', () => {
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const { windowStart, windowEnd } = calculateWindowBounds('hourly', ref)

    expect(windowStart.toISOString()).toBe('2026-04-16T14:00:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-04-16T15:00:00.000Z')
  })

  it('minute window truncates to :00 seconds', () => {
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const { windowStart, windowEnd } = calculateWindowBounds('minute', ref)

    expect(windowStart.toISOString()).toBe('2026-04-16T14:37:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-04-16T14:38:00.000Z')
  })

  it('weekly window snaps to Monday 00:00 UTC (ISO week start)', () => {
    // 2026-04-16 is a Thursday → expected Monday is 2026-04-13
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const { windowStart, windowEnd } = calculateWindowBounds('weekly', ref)

    expect(windowStart.toISOString()).toBe('2026-04-13T00:00:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-04-20T00:00:00.000Z')
  })

  it('weekly window handles Sunday correctly (ISO week: Sun rolls back 6 days)', () => {
    // 2026-04-19 is a Sunday → ISO week start is Monday 2026-04-13
    const ref = new Date('2026-04-19T23:00:00.000Z')
    const { windowStart } = calculateWindowBounds('weekly', ref)
    expect(windowStart.toISOString()).toBe('2026-04-13T00:00:00.000Z')
  })

  it('weekly window handles Monday correctly (stays on the same day)', () => {
    const ref = new Date('2026-04-13T08:00:00.000Z') // Monday
    const { windowStart } = calculateWindowBounds('weekly', ref)
    expect(windowStart.toISOString()).toBe('2026-04-13T00:00:00.000Z')
  })

  it('rolling window ends at referenceTime and spans windowSizeHours', () => {
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const { windowStart, windowEnd } = calculateWindowBounds('rolling', ref, undefined, undefined, 6)

    expect(windowEnd.getTime()).toBe(ref.getTime())
    expect(windowEnd.getTime() - windowStart.getTime()).toBe(6 * 60 * 60 * 1000)
  })

  it('rolling window defaults to 24h when size is null/undefined', () => {
    const ref = new Date('2026-04-16T14:37:12.345Z')
    const defaulted = calculateWindowBounds('rolling', ref)
    const nulled = calculateWindowBounds('rolling', ref, undefined, undefined, null)

    const expectedSpan = 24 * 60 * 60 * 1000
    expect(defaulted.windowEnd.getTime() - defaulted.windowStart.getTime()).toBe(expectedSpan)
    expect(nulled.windowEnd.getTime() - nulled.windowStart.getTime()).toBe(expectedSpan)
  })

  it('unknown window type throws', () => {
    const ref = new Date('2026-04-16T00:00:00.000Z')
    expect(() => calculateWindowBounds('monthly', ref)).toThrow(/Unknown window type/)
  })
})

describe('calculateWindowBounds — aggregator/finalizer parity', () => {
  // Simulate: aggregator writes stats when the event fires; finalizer reads
  // them back milliseconds to hours later. Both must compute the same
  // windowStart for any bucket-snapping window type.
  const WINDOWS_TO_TEST = ['daily', 'hourly', 'minute', 'weekly'] as const

  it.each(WINDOWS_TO_TEST)(
    '%s: aggregator-time and finalizer-time within the same bucket agree',
    (windowType) => {
      // Event happens early in the bucket, finalizer runs late in the bucket
      const eventTime = new Date('2026-04-16T14:00:05.000Z')
      const finalizerTime = new Date('2026-04-16T14:59:55.000Z')

      const atWrite = calculateWindowBounds(windowType, eventTime)
      const atRead = calculateWindowBounds(windowType, finalizerTime)

      // minute bucket boundary falls between these two reference times;
      // parity only holds when both are in the same bucket.
      if (windowType === 'minute') {
        expect(atWrite.windowStart.getTime()).not.toBe(atRead.windowStart.getTime())
      } else {
        expect(atWrite.windowStart.getTime()).toBe(atRead.windowStart.getTime())
        expect(atWrite.windowEnd.getTime()).toBe(atRead.windowEnd.getTime())
      }
    },
  )

  it('campaign: aggregator and finalizer agree regardless of time gap', () => {
    const eventTime = new Date('2026-04-02T05:00:00.000Z')
    const finalizerTime = new Date('2026-04-28T23:00:00.000Z')

    const atWrite = calculateWindowBounds('campaign', eventTime, CAMPAIGN_STARTS, CAMPAIGN_ENDS)
    const atRead = calculateWindowBounds('campaign', finalizerTime, CAMPAIGN_STARTS, CAMPAIGN_ENDS)

    expect(atWrite.windowStart.getTime()).toBe(atRead.windowStart.getTime())
    expect(atWrite.windowEnd.getTime()).toBe(atRead.windowEnd.getTime())
  })

  it('rolling: aggregator and finalizer do NOT agree — documenting intentional drift', () => {
    // Rolling windows are anchored on referenceTime by design. The system
    // must not use 'rolling' for persisted stat rows where parity matters;
    // this test pins the non-parity so anyone repurposing `rolling` for
    // persisted stats hits a failing check.
    const eventTime = new Date('2026-04-16T14:00:00.000Z')
    const finalizerTime = new Date('2026-04-16T15:00:00.000Z')

    const atWrite = calculateWindowBounds('rolling', eventTime, undefined, undefined, 24)
    const atRead = calculateWindowBounds('rolling', finalizerTime, undefined, undefined, 24)

    expect(atWrite.windowStart.getTime()).not.toBe(atRead.windowStart.getTime())
  })
})
