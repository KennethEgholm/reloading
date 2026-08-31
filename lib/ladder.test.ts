import { describe, it, expect } from 'vitest'
import {
  generateCharges,
  aggregateLadderStats,
  buildLadderRows,
  formatCharge,
  LADDER_MIN_STEPS,
  LADDER_MAX_STEPS,
} from './ladder'

describe('generateCharges', () => {
  it('generates an ascending sequence with 1-based indexes', () => {
    const charges = generateCharges(40.0, 0.5, 5)
    expect(charges.map((c) => c.charge)).toEqual([40.0, 40.5, 41.0, 41.5, 42.0])
    expect(charges.map((c) => c.index)).toEqual([1, 2, 3, 4, 5])
  })

  it('generates a descending sequence when step is negative', () => {
    const charges = generateCharges(42.0, -0.3, 3)
    expect(charges.map((c) => c.charge)).toEqual([42.0, 41.7, 41.4])
  })

  it('rounds away float junk from decimal steps', () => {
    // 40.0 + 0.3×3 must be 40.9, not 40.899999999999999
    const charges = generateCharges(40.0, 0.3, 4)
    expect(charges[3].charge).toBe(40.9)
    expect(charges.map((c) => c.charge)).toEqual([40.0, 40.3, 40.6, 40.9])
  })

  it('rejects count below the minimum', () => {
    expect(() => generateCharges(40, 0.5, LADDER_MIN_STEPS - 1)).toThrow()
  })

  it('rejects count above the maximum', () => {
    expect(() => generateCharges(40, 0.5, LADDER_MAX_STEPS + 1)).toThrow()
  })

  it('rejects a zero step', () => {
    expect(() => generateCharges(40, 0, 5)).toThrow(/zero/i)
  })

  it('rejects a non-integer count', () => {
    expect(() => generateCharges(40, 0.5, 4.5)).toThrow()
  })

  it('rejects non-positive charges anywhere in the sequence', () => {
    expect(() => generateCharges(40, -10, 5)).toThrow(/greater than zero/i)
  })

  it('rejects non-finite inputs', () => {
    expect(() => generateCharges(Number.NaN, 0.5, 5)).toThrow()
    expect(() => generateCharges(40, Number.NaN, 5)).toThrow()
    expect(() => generateCharges(40, 0.5, Number.NaN)).toThrow()
  })
})

describe('formatCharge', () => {
  it('trims trailing zeros but keeps significant decimals', () => {
    expect(formatCharge(40)).toBe('40')
    expect(formatCharge(40.5)).toBe('40.5')
    expect(formatCharge(40.25)).toBe('40.25')
    expect(formatCharge(40.1)).toBe('40.1')
  })
})

describe('aggregateLadderStats', () => {
  const baseMember = {
    recipeId: 'r1',
    chargeGr: 40.5,
    groupMoas: [1.2, 0.8, 1.0],
    sessionVelocityAvgs: [800, 810],
    sessionVelocityMins: [790, 800],
    sessionVelocityMaxs: [810, 820],
    sessionStdDevs: [5, 7],
    sessionCount: 2,
  }

  it('aggregates MOA, velocity, ES and SD across groups/sessions', () => {
    const row = aggregateLadderStats(baseMember)
    expect(row.recipeId).toBe('r1')
    expect(row.chargeGr).toBe(40.5)
    expect(row.avgMoa).toBe(1.0)
    expect(row.bestMoa).toBe(0.8)
    expect(row.avgVelocity).toBe(805)
    expect(row.extremeSpread).toBe(30) // 820 − 790
    expect(row.avgStdDev).toBe(6)
    expect(row.sessionCount).toBe(2)
  })

  it('returns nulls for a member with no data', () => {
    const row = aggregateLadderStats({
      recipeId: 'r2',
      chargeGr: 41.0,
      groupMoas: [],
      sessionVelocityAvgs: [],
      sessionVelocityMins: [],
      sessionVelocityMaxs: [],
      sessionStdDevs: [],
      sessionCount: 0,
    })
    expect(row.avgMoa).toBeNull()
    expect(row.bestMoa).toBeNull()
    expect(row.avgVelocity).toBeNull()
    expect(row.extremeSpread).toBeNull()
    expect(row.avgStdDev).toBeNull()
    expect(row.sessionCount).toBe(0)
  })

  it('ignores null velocity values when aggregating', () => {
    const row = aggregateLadderStats({
      ...baseMember,
      sessionVelocityAvgs: [800, null, 820],
      sessionVelocityMins: [790, null, 800],
      sessionVelocityMaxs: [810, null, 830],
      sessionStdDevs: [5, null, 7],
    })
    expect(row.avgVelocity).toBe(810)
    expect(row.extremeSpread).toBe(40) // 830 − 790
    expect(row.avgStdDev).toBe(6)
  })

  it('computes ES as max(max) − min(min) across sessions, not within', () => {
    const row = aggregateLadderStats({
      ...baseMember,
      sessionVelocityMins: [780, 795],
      sessionVelocityMaxs: [805, 825],
    })
    expect(row.extremeSpread).toBe(45) // 825 − 780
  })
})

describe('buildLadderRows', () => {
  it('returns empty for no members', () => {
    expect(buildLadderRows([])).toEqual([])
  })

  it('pairs each recipe with aggregated stats', () => {
    const rows = buildLadderRows([
      {
        id: 'r1',
        chargeGr: 40,
        ladderChargeIndex: 1,
        rangeLogs: [
          {
            velocityMin: 790,
            velocityMax: 810,
            velocityAvg: 800,
            stdDev: 5,
            groups: [{ moa: 1.2 }, { moa: 0.8 }],
          },
        ],
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].recipe.id).toBe('r1')
    expect(rows[0].avgMoa).toBe(1.0)
    expect(rows[0].bestMoa).toBe(0.8)
    expect(rows[0].avgVelocity).toBe(800)
    expect(rows[0].extremeSpread).toBe(20)
    expect(rows[0].sessionCount).toBe(1)
  })
})