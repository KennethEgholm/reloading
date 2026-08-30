import { describe, it, expect } from 'vitest'
import { formatBc, formatBcSuffix, formatDate, formatDateLong, formatDateTime, formatTwistSuffix } from './format'

// 2026-06-02 14:07 CEST (Europe/Copenhagen) — a date where day and month
// differ, so DD/MM/YYYY vs MM/DD/YYYY mixes are detectable.
const SAMPLE = new Date('2026-06-02T14:07:00+02:00')

describe('formatDate', () => {
  it('always renders DD/MM/YYYY regardless of locale', () => {
    expect(formatDate(SAMPLE)).toBe('02/06/2026')
    expect(formatDate(SAMPLE, 'en')).toBe('02/06/2026')
    expect(formatDate(SAMPLE, 'da')).toBe('02.06.2026')
    expect(formatDate(SAMPLE, 'en-GB')).toBe('02/06/2026')
  })

  it('accepts ISO strings and epoch numbers', () => {
    expect(formatDate('2026-06-02T14:07:00+02:00', 'en')).toBe('02/06/2026')
    expect(formatDate(SAMPLE.getTime(), 'en')).toBe('02/06/2026')
  })
})

describe('formatDateTime', () => {
  it('date part is always DD/MM/YYYY', () => {
    expect(formatDateTime(SAMPLE, 'en')).toBe('02/06/2026, 14:07')
    expect(formatDateTime(SAMPLE, 'da')).toBe('02.06.2026, 14.07')
  })
})

describe('formatDateLong', () => {
  it('renders weekday and month names in the active locale', () => {
    expect(formatDateLong(SAMPLE, 'da')).toBe('tirsdag den 2. juni 2026')
  })
})

describe('formatBc', () => {
  it('returns empty when both are unset', () => {
    expect(formatBc(null, null)).toBe('')
    expect(formatBc(undefined, undefined)).toBe('')
  })

  it('formats a single model', () => {
    expect(formatBc(0.462, null)).toBe('G1 0.462')
    expect(formatBc(null, 0.237)).toBe('G7 0.237')
  })

  it('formats both models', () => {
    expect(formatBc(0.462, 0.237)).toBe('G1 0.462 / G7 0.237')
  })
})

describe('formatBcSuffix', () => {
  it('returns empty when both are unset', () => {
    expect(formatBcSuffix(null, null)).toBe('')
  })

  it('prefixes a comma', () => {
    expect(formatBcSuffix(0.462, 0.237)).toBe(', G1 0.462 / G7 0.237')
  })
})

describe('formatTwistSuffix', () => {
  it('returns empty when unset', () => {
    expect(formatTwistSuffix(null)).toBe('')
    expect(formatTwistSuffix(undefined)).toBe('')
  })

  it('formats 1:N', () => {
    expect(formatTwistSuffix(10)).toBe(', 1:10')
  })
})
