import { describe, it, expect } from 'vitest'
import {
  kineticEnergyJ,
  canComputeBallistics,
  computeRangeTable,
  resolveDrag,
  elevationClicks,
  RANGE_TABLE_DISTANCES_M,
} from './ballistics'

describe('kineticEnergyJ', () => {
  it('matches ½mv² for 168 gr at 800 m/s', () => {
    const e = kineticEnergyJ(168, 800)
    expect(e).toBeCloseTo(3483.5, 0)
  })
})

describe('resolveDrag', () => {
  it('prefers G7 when both are set', () => {
    expect(resolveDrag(0.462, 0.237)).toEqual({ model: 'G7', bc: 0.237 })
  })

  it('falls back to G1', () => {
    expect(resolveDrag(0.462, null)).toEqual({ model: 'G1', bc: 0.462 })
  })

  it('returns null when neither is set', () => {
    expect(resolveDrag(null, null)).toBeNull()
    expect(resolveDrag(0, 0)).toBeNull()
  })
})

describe('canComputeBallistics', () => {
  const base = { measuredV0: 800, weightGr: 168, bcG1: 0.462, bcG7: null }

  it('requires measured V0, weight, and a BC', () => {
    expect(canComputeBallistics(base)).toBe(true)
    expect(canComputeBallistics({ ...base, measuredV0: null })).toBe(false)
    expect(canComputeBallistics({ ...base, measuredV0: 0 })).toBe(false)
    expect(canComputeBallistics({ ...base, bcG1: null })).toBe(false)
  })
})

describe('computeRangeTable', () => {
  it('returns 50–800 m in 50 m steps', () => {
    const rows = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462 })
    expect(rows.map((r) => r.distanceM)).toEqual([...RANGE_TABLE_DISTANCES_M])
  })

  it('velocity and energy fall with distance', () => {
    const rows = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462 })
    expect(rows[0].velocityMs).toBeLessThan(800)
    expect(rows[0].velocityMs).toBeGreaterThan(700)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].velocityMs).toBeLessThan(rows[i - 1].velocityMs)
      expect(rows[i].energyJ).toBeLessThan(rows[i - 1].energyJ)
    }
  })

  it('a higher BC retains more velocity', () => {
    const low = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.3 })
    const high = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.6 })
    expect(high[high.length - 1].velocityMs).toBeGreaterThan(low[low.length - 1].velocityMs)
  })

  it('returns empty when data is missing', () => {
    expect(computeRangeTable({ measuredV0: null, weightGr: 168, bcG1: 0.462 })).toEqual([])
  })

  it('omits drop when zero is not set', () => {
    const rows = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462 })
    expect(rows.every((r) => r.dropCm == null)).toBe(true)
  })

  it('converts drop to clicks using cm at 100 m', () => {
    expect(elevationClicks(10, 100)).toBe(10)
    expect(elevationClicks(20, 200)).toBe(10)
    expect(elevationClicks(8, 800)).toBe(1)
    expect(elevationClicks(10, 100, 2)).toBe(5)
  })

  it('omits drop when sight height is not set', () => {
    const rows = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462, zeroDistanceM: 100 })
    expect(rows.every((r) => r.dropCm == null)).toBe(true)
  })

  it('is ~0 drop at the zero distance and falls after', () => {
    const rows = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462, zeroDistanceM: 100, sightHeightCm: 5 })
    const atZero = rows.find((r) => r.distanceM === 100)
    const at800 = rows.find((r) => r.distanceM === 800)
    const at400 = rows.find((r) => r.distanceM === 400)
    expect(atZero?.dropCm).toBeCloseTo(0, 0)
    expect(at800!.dropCm!).toBeGreaterThan(at400!.dropCm!)
    expect(at400!.dropCm!).toBeGreaterThan(0)
    expect(atZero?.clicks).toBe(0)
    expect(at800!.clicks!).toBeGreaterThan(0)
  })

  it('a taller sight changes near drop', () => {
    const low = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462, zeroDistanceM: 100, sightHeightCm: 3 })
    const high = computeRangeTable({ measuredV0: 800, weightGr: 168, bcG1: 0.462, zeroDistanceM: 100, sightHeightCm: 8 })
    expect(low.find((r) => r.distanceM === 50)!.dropCm).not.toBe(high.find((r) => r.distanceM === 50)!.dropCm)
  })
})
