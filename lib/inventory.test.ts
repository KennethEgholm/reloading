import { describe, it, expect } from 'vitest'
import { getPossibleLoads, GRAIN_TO_GRAM } from './inventory'

describe('getPossibleLoads', () => {
  it('is limited by the scarcest component (primer here)', () => {
    // 1000 projectiles, plenty of powder, only 50 primers → 50 loads.
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 1000 },
      propellant: { amountGr: 1000 },
      primer: { amount: 50 },
    }
    expect(getPossibleLoads(recipe)).toBe(50)
  })

  it('is limited by projectile count when projectiles are scarcest', () => {
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 12 },
      propellant: { amountGr: 1000 },
      primer: { amount: 500 },
    }
    expect(getPossibleLoads(recipe)).toBe(12)
  })

  it('floors the powder-limited count (no partial rounds)', () => {
    // 10 g powder, 40 gr charge = 40 * 0.06479891 = 2.5919564 g per load.
    // 10 / 2.5919564 = 3.858… → floored to 3.
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 1000 },
      propellant: { amountGr: 10 },
      primer: { amount: 1000 },
    }
    const gramsPerLoad = 40 * GRAIN_TO_GRAM
    expect(getPossibleLoads(recipe)).toBe(Math.floor(10 / gramsPerLoad))
    expect(getPossibleLoads(recipe)).toBe(3)
  })

  it('ignores the powder constraint when no charge weight is set', () => {
    // chargeGr null → powder does not limit; result is the projectile count.
    const recipe = {
      chargeGr: null,
      projectile: { amount: 7 },
      propellant: { amountGr: 1000 },
      primer: { amount: 500 },
    }
    expect(getPossibleLoads(recipe)).toBe(7)
  })

  it('does not constrain on primer when the recipe uses none', () => {
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 9 },
      propellant: { amountGr: 1000 },
      primer: null,
    }
    expect(getPossibleLoads(recipe)).toBe(9)
  })

  it('returns 0 (not null) when a present component is exhausted', () => {
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 0 },
      propellant: { amountGr: 1000 },
      primer: { amount: 500 },
    }
    expect(getPossibleLoads(recipe)).toBe(0)
  })

  it('treats a present-but-zero primer as 0 loads', () => {
    const recipe = {
      chargeGr: 40,
      projectile: { amount: 1000 },
      propellant: { amountGr: 1000 },
      primer: { amount: 0 },
    }
    expect(getPossibleLoads(recipe)).toBe(0)
  })

  it('returns 0 for empty input (projectile count defaults to 0 and always constrains)', () => {
    // fromProjectile is always finite (0 when absent), so the result is never
    // null in practice — the min is 0 here, not null.
    expect(getPossibleLoads({})).toBe(0)
  })
})
