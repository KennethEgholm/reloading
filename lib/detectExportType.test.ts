import { describe, it, expect } from 'vitest'
import { detectExportType, inventoryHasData, sectionHasData } from './detectExportType'

const inventory = {
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  primers: [{ brand: 'CCI', type: 'Small Rifle' }],
  projectiles: [],
  propellants: [],
  cartridges: [],
}

const recipes = {
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  recipes: [{ name: '308', caliber: '308 Win' }],
}

describe('detectExportType', () => {
  it('detects a full everything bundle (nested objects, not arrays)', () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      inventory,
      recipes,
      loadLogs: { version: 1, loadLogs: [] },
      rangeLogs: { version: 1, rangeLogs: [] },
      factoryAmmo: { version: 1, factoryAmmo: [] },
    })
    expect(detectExportType(json)).toBe('everything')
  })

  it('detects a recipes-only export (top-level array)', () => {
    expect(detectExportType(JSON.stringify(recipes))).toBe('recipes')
  })

  it('detects an inventory-only export', () => {
    expect(detectExportType(JSON.stringify(inventory))).toBe('inventory')
  })

  it('returns null for invalid JSON', () => {
    expect(detectExportType('not json')).toBeNull()
  })

  it('returns null for an unrelated object', () => {
    expect(detectExportType(JSON.stringify({ version: 1, foo: [] }))).toBeNull()
  })
})

describe('inventoryHasData / sectionHasData', () => {
  it('is true when any inventory array has rows', () => {
    expect(inventoryHasData(inventory)).toBe(true)
    expect(inventoryHasData({ primers: [], projectiles: [], propellants: [], cartridges: [] })).toBe(false)
  })

  it('is true when the named section array has rows', () => {
    expect(sectionHasData(recipes, 'recipes')).toBe(true)
    expect(sectionHasData({ recipes: [] }, 'recipes')).toBe(false)
  })
})
