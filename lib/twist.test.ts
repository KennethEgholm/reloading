import { describe, it, expect } from 'vitest'
import { twistsDiffer } from './twist'

describe('twistsDiffer', () => {
  it('is false when either value is missing', () => {
    expect(twistsDiffer(null, 10)).toBe(false)
    expect(twistsDiffer(10, null)).toBe(false)
    expect(twistsDiffer(undefined, undefined)).toBe(false)
  })

  it('is false when they match', () => {
    expect(twistsDiffer(10, 10)).toBe(false)
    expect(twistsDiffer(10, 10.02)).toBe(false)
  })

  it('is true when they differ', () => {
    expect(twistsDiffer(10, 8)).toBe(true)
    expect(twistsDiffer(8, 10)).toBe(true)
  })
})
