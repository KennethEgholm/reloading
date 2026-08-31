import { describe, it, expect } from 'vitest'
import { bucketMonthlyActivity, monthWindow, type ActivityInput } from './monthlyActivity'

// 2026-08-15, mid-day Copenhagen — safely inside the month regardless of TZ shifts.
const AUG_15 = new Date('2026-08-15T12:00:00+02:00')
const SEP_01 = new Date('2026-09-01T12:00:00+02:00')

describe('monthWindow', () => {
  it('returns the requested number of buckets, oldest first, ending with the reference month', () => {
    const w = monthWindow(SEP_01, 3)
    expect(w).toHaveLength(3)
    expect(w.map((d) => d.toISOString().slice(0, 7))).toEqual(['2026-07', '2026-08', '2026-09'])
  })

  it('rolls across year boundaries', () => {
    const w = monthWindow(AUG_15, 12)
    expect(w[0].toISOString().slice(0, 7)).toBe('2025-09')
    expect(w[11].toISOString().slice(0, 7)).toBe('2026-08')
  })
})

describe('bucketMonthlyActivity', () => {
  it('sums fired and loaded rounds per month', () => {
    const fired: ActivityInput[] = [
      { date: AUG_15, rounds: 30 },
      { date: '2026-08-20T10:00:00+02:00', rounds: 20 },
      { date: SEP_01, rounds: 10 },
    ]
    const loaded: ActivityInput[] = [{ date: AUG_15, rounds: 50 }]

    const buckets = bucketMonthlyActivity(fired, loaded, SEP_01, 3)
    expect(buckets.map((b) => b.key)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(buckets[1].fired).toBe(50)
    expect(buckets[1].loaded).toBe(50)
    expect(buckets[2].fired).toBe(10)
    expect(buckets[2].loaded).toBe(0)
  })

  it('ignores rows outside the window', () => {
    const old: ActivityInput[] = [
      { date: new Date('2020-01-01T12:00:00+01:00'), rounds: 99 },
    ]
    const buckets = bucketMonthlyActivity(old, [], SEP_01, 3)
    expect(buckets.every((b) => b.fired === 0 && b.loaded === 0)).toBe(true)
  })

  it('keeps empty months as zero buckets', () => {
    const buckets = bucketMonthlyActivity([], [], SEP_01, 5)
    expect(buckets).toHaveLength(5)
    expect(buckets.every((b) => b.fired === 0 && b.loaded === 0)).toBe(true)
  })

  it('buckets a Copenhagen late-evening shot into the experienced month', () => {
    // 2026-08-31 23:50 Copenhagen = 2026-08-31 21:50 UTC — same month in UTC
    // and Copenhagen, so this asserts stable keying more than TZ shifting.
    const late = new Date('2026-08-31T23:50:00+02:00')
    const buckets = bucketMonthlyActivity([{ date: late, rounds: 5 }], [], late, 2)
    expect(buckets[1].key).toBe('2026-08')
    expect(buckets[1].fired).toBe(5)
  })
})