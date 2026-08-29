import { describe, it, expect } from 'vitest'
import {
  projectileNeedsFill,
  fillNeeds,
  sanitizeProjectileSuggestion,
  sanitizeProjectileSuggestions,
} from './projectileAi'

const needsAll = fillNeeds({ id: 'p1', preferredTwistIn: null, bcG1: null, bcG7: null })

describe('projectileNeedsFill', () => {
  it('is true when any optional field is missing', () => {
    expect(projectileNeedsFill({ preferredTwistIn: null, bcG1: 0.4, bcG7: 0.2 })).toBe(true)
    expect(projectileNeedsFill({ preferredTwistIn: 10, bcG1: 0.4, bcG7: 0.2 })).toBe(false)
  })
})

describe('sanitizeProjectileSuggestion', () => {
  it('keeps valid values only for missing fields', () => {
    const r = sanitizeProjectileSuggestion(
      { id: 'p1', preferredTwistIn: 10, bcG1: 0.462, bcG7: 0.237 },
      needsAll,
    )
    expect(r).toEqual({ id: 'p1', preferredTwistIn: 10, bcG1: 0.462, bcG7: 0.237 })
  })

  it('drops fields the projectile already has', () => {
    const r = sanitizeProjectileSuggestion(
      { id: 'p1', preferredTwistIn: 10, bcG1: 0.462 },
      fillNeeds({ id: 'p1', preferredTwistIn: 8, bcG1: null, bcG7: 0.2 }),
    )
    expect(r).toEqual({ id: 'p1', preferredTwistIn: null, bcG1: 0.462, bcG7: null })
  })

  it('rejects garbage and out-of-range numbers', () => {
    expect(sanitizeProjectileSuggestion({ id: 'p1', preferredTwistIn: 0 }, needsAll)).toBeNull()
    expect(sanitizeProjectileSuggestion({ id: 'p1', bcG1: 9 }, needsAll)).toBeNull()
    expect(sanitizeProjectileSuggestion({ id: 'other', preferredTwistIn: 10 }, needsAll)).toBeNull()
  })
})

describe('sanitizeProjectileSuggestions', () => {
  it('reads a wrapped suggestions array and skips unknown ids', () => {
    const map = new Map([['p1', needsAll]])
    const r = sanitizeProjectileSuggestions(
      { suggestions: [{ id: 'p1', preferredTwistIn: 10 }, { id: 'nope', preferredTwistIn: 8 }] },
      map,
    )
    expect(r).toEqual([{ id: 'p1', preferredTwistIn: 10, bcG1: null, bcG7: null }])
  })
})
