import { describe, it, expect } from 'vitest'
import {
  createCartridgeSchema,
  createProjectileSchema,
  createPrimerSchema,
  createPropellantSchema,
  createLoadLogSchema,
  shotsSchema,
  formatZodError,
} from './schemas'

// The schemas take a translator; tests echo the key back so assertions can
// check which message fired without depending on locale content.
const t = (key: string) => key

describe('createProjectileSchema', () => {
  const schema = () => createProjectileSchema(t)

  it('rejects a garbage numeric weight (the old parseFloat("12abc") → 12 bug)', () => {
    const r = schema().safeParse({
      brand: 'Sierra',
      type: 'GameKing',
      weightGr: '12abc',
      caliber: '.308',
      amount: '5',
    })
    expect(r.success).toBe(false)
  })

  it('rejects a non-positive weight', () => {
    const r = schema().safeParse({
      brand: 'Sierra', type: 'GameKing', weightGr: '0', caliber: '.308', amount: '5',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === 'form.validation.weightPositive')).toBe(true)
    }
  })

  it('rejects a negative amount', () => {
    const r = schema().safeParse({
      brand: 'Sierra', type: 'GameKing', weightGr: '150', caliber: '.308', amount: '-3',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === 'form.validation.amountNegative')).toBe(true)
    }
  })

  it('coerces and trims a valid payload', () => {
    const r = schema().safeParse({
      brand: '  Sierra ', type: 'GameKing', weightGr: '150.5', caliber: '.308', amount: '40',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toMatchObject({ brand: 'Sierra', weightGr: 150.5, amount: 40 })
    }
  })

  it('defaults an empty amount to 0', () => {
    const r = schema().safeParse({
      brand: 'Sierra', type: 'GameKing', weightGr: '150', caliber: '.308', amount: '',
    })
    expect(r.success && r.data.amount).toBe(0)
  })
})

describe('createCartridgeSchema', () => {
  const schema = () => createCartridgeSchema(t)

  it('requires brand and caliber', () => {
    const r = schema().safeParse({ brand: '', caliber: '', amount: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs).toContain('form.validation.brandRequired')
      expect(msgs).toContain('form.validation.caliberRequired')
    }
  })

  it('coerces an empty optional waterCapacity to null', () => {
    const r = schema().safeParse({ brand: 'Lapua', caliber: '6.5CM', waterCapacityGr: '', amount: '50' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.waterCapacityGr).toBeNull()
  })

  it('keeps a provided waterCapacity and rejects a negative one', () => {
    const ok = schema().safeParse({ brand: 'Lapua', caliber: '6.5CM', waterCapacityGr: '53.5', amount: '50' })
    expect(ok.success && ok.data.waterCapacityGr).toBe(53.5)

    const bad = schema().safeParse({ brand: 'Lapua', caliber: '6.5CM', waterCapacityGr: '-1', amount: '50' })
    expect(bad.success).toBe(false)
  })
})

describe('createPrimerSchema', () => {
  const schema = () => createPrimerSchema(t)

  it('accepts a valid PrimerType and interprets magnum "on" as true', () => {
    const r = schema().safeParse({
      brand: 'CCI', type: 'SMALL_RIFLE', magnum: 'on', amount: '100',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.magnum).toBe(true)
      expect(r.data.amount).toBe(100)
    }
  })

  it('treats a missing magnum field as false', () => {
    const r = schema().safeParse({ brand: 'CCI', type: 'LARGE_RIFLE', magnum: null, amount: '100' })
    expect(r.success && r.data.magnum).toBe(false)
  })

  it('rejects an invalid PrimerType', () => {
    const r = schema().safeParse({ brand: 'CCI', type: 'HUGE_RIFLE', magnum: null, amount: '100' })
    expect(r.success).toBe(false)
  })

  it('rejects a negative amount', () => {
    const r = schema().safeParse({ brand: 'CCI', type: 'SMALL_PISTOL', magnum: null, amount: '-5' })
    expect(r.success).toBe(false)
  })
})

describe('createPropellantSchema', () => {
  it('rejects a negative amount and accepts zero stock', () => {
    const schema = createPropellantSchema(t)
    expect(schema.safeParse({ brand: 'Vihtavuori', type: 'N140', amountGr: '-1' }).success).toBe(false)
    expect(schema.safeParse({ brand: 'Vihtavuori', type: 'N140', amountGr: '0' }).success).toBe(true)
    const rounded = schema.safeParse({ brand: 'Vihtavuori', type: 'N140', amountGr: '247.399999999' })
    expect(rounded.success).toBe(true)
    if (rounded.success) expect(rounded.data.amountGr).toBe(247)
  })
})

describe('createLoadLogSchema', () => {
  const schema = () => createLoadLogSchema(t)

  it('requires a positive integer quantity', () => {
    expect(schema().safeParse({ recipeId: 'r1', quantity: '0' }).success).toBe(false)
    expect(schema().safeParse({ recipeId: 'r1', quantity: '-2' }).success).toBe(false)
    expect(schema().safeParse({ recipeId: '', quantity: '50' }).success).toBe(false)
  })

  it('parses a valid log and trims notes', () => {
    const r = schema().safeParse({ recipeId: 'r1', quantity: '50', date: '', notes: '  good batch ' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.quantity).toBe(50)
      expect(r.data.notes).toBe('good batch')
    }
  })
})

describe('formatZodError', () => {
  it('joins issues as "path: message" lines', () => {
    const r = createProjectileSchema(t).safeParse({ brand: '', type: '', weightGr: 'x', caliber: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msg = formatZodError(r.error)
      expect(msg).toContain('brand: form.validation.brandRequired')
      expect(msg.split('\n').length).toBeGreaterThan(1)
    }
  })
})

describe('shotsSchema', () => {
  it('accepts two or more valid shots', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(true)
  })

  it('rejects fewer than two shots', () => {
    const r = shotsSchema.safeParse([{ shotIndex: 1, velocity: 950.0 }])
    expect(r.success).toBe(false)
  })

  it('rejects a non-positive velocity', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: 0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })

  it('rejects NaN velocity', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: NaN },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })

  it('rejects a non-integer shotIndex', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1.5, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })
})
