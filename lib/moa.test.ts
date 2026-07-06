import { describe, it, expect } from 'vitest'
import { computeMoa, averageMoa, MOA_PER_RADIAN } from './moa'

describe('computeMoa', () => {
  it('converts mm/m to MOA via the radian → MOA constant', () => {
    // 1 MOA at 100 m ≈ 29.09 mm. So a 29.09 mm group at 100 m ≈ 1.00 MOA.
    expect(computeMoa(29.09, 100)).toBeCloseTo(1.0, 1)
  })

  it('returns 0 MOA for a zero-size group', () => {
    expect(computeMoa(0, 100)).toBe(0)
  })

  it('scales linearly with group size at fixed distance (before rounding)', () => {
    // Use raw values that don't round across the 2-decimal boundary.
    expect(computeMoa(20, 100)).toBeCloseTo(computeMoa(10, 100) * 2, 1)
    expect(computeMoa(50, 100)).toBeCloseTo(computeMoa(10, 100) * 5, 1)
  })

  it('scales inversely with distance at fixed group size (before rounding)', () => {
    const at100 = computeMoa(20, 100)
    const at200 = computeMoa(20, 200)
    expect(at200).toBeCloseTo(at100 / 2, 1)
    const at50 = computeMoa(20, 50)
    expect(at50).toBeCloseTo(at100 * 2, 1)
  })

  it('matches the canonical 1-inch-at-100-yards reference within rounding', () => {
    // 1 inch = 25.4 mm; 100 yards = 91.44 m. 1 MOA ≈ 1.047 in at 100 yd.
    // So a 25.4 mm group at 91.44 m should be ~0.955 MOA (1 / 1.047).
    expect(computeMoa(25.4, 91.44)).toBeCloseTo(0.95, 1)
  })

  it('uses MOA_PER_RADIAN as the conversion factor', () => {
    // Sanity: the constant equals 10800 / π.
    expect(MOA_PER_RADIAN).toBeCloseTo(10800 / Math.PI, 10)
  })

  it('rounds to 2 decimals', () => {
    const moa = computeMoa(10, 100)
    // No more than 2 decimals in the rounded result.
    const decimals = (moa.toString().split('.')[1] || '').length
    expect(decimals).toBeLessThanOrEqual(2)
  })

  it('throws on non-finite inputs', () => {
    expect(() => computeMoa(NaN, 100)).toThrow()
    expect(() => computeMoa(10, Infinity)).toThrow()
  })

  it('throws on negative group size', () => {
    expect(() => computeMoa(-1, 100)).toThrow()
  })

  it('throws on zero or negative distance', () => {
    expect(() => computeMoa(10, 0)).toThrow()
    expect(() => computeMoa(10, -5)).toThrow()
  })
})

describe('averageMoa', () => {
  it('returns null for an empty list', () => {
    expect(averageMoa([])).toBeNull()
  })

  it('returns the single value for a one-element list', () => {
    expect(averageMoa([0.84])).toBe(0.84)
  })

  it('averages multiple values and rounds to 2 decimals', () => {
    expect(averageMoa([0.5, 1.0, 1.5])).toBe(1.0)
    expect(averageMoa([0.51, 0.52, 0.53])).toBe(0.52)
  })

  it('handles a realistic load-development set', () => {
    const groups = [0.84, 0.92, 0.78, 1.05, 0.88]
    const avg = averageMoa(groups)
    expect(avg).not.toBeNull()
    expect(avg).toBeCloseTo(0.89, 2)
  })
})