import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for the action's external dependencies ----------------------------
//
// range/actions.ts is a Server Action module. We exercise its snapshot
// orchestration (recipe fetch on create, re-snapshot only on recipe-link change,
// transaction usage, error propagation) against a mocked Prisma client — no
// database and no real filesystem writes.

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

// Avoid real mkdir/writeFile/unlink on disk during tests (the action calls
// mkdir unconditionally even when no images are attached).
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}))

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      recipe: { findUnique: vi.fn() },
      rangeLog: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      rangeLogImage: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      rangeLogShot: { createMany: vi.fn(), deleteMany: vi.fn() },
      // $transaction(fn) runs the callback with the same mock acting as `tx`,
      // mirroring Prisma's interactive-transaction API.
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { createRangeLog, updateRangeLog } from './actions'

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

// A recipe with projectile/propellant/primer + cartridge resolved, charge 40, COAL 2.8.
function makeRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recipe-1',
    name: 'Test Load',
    caliber: '.308',
    chargeGr: 40,
    coal: 2.8,
    calculatedV0: 800,
    measuredV0: null,
    fillRate: 90,
    projectileId: 'proj-1',
    propellantId: 'prop-1',
    primerId: 'prim-1',
    cartridgeId: 'cart-1',
    projectile: { id: 'proj-1', brand: 'Sierra', type: 'GameKing', weightGr: 168 },
    propellant: { id: 'prop-1', brand: 'Vihtavuori', type: 'N140' },
    primer: { id: 'prim-1', brand: 'CCI', type: 'LARGE_RIFLE' },
    cartridge: { id: 'cart-1', brand: 'Lapua', caliber: '.308', waterCapacityGr: 56.0 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRangeLog', () => {
  it('rejects an invalid payload before touching the database', async () => {
    await expect(
      createRangeLog(form({ date: '', recipeId: '', roundsFired: '0' })),
    ).rejects.toThrow()
    expect(prismaMock.recipe.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('throws when the recipe is not found', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(null)
    await expect(
      createRangeLog(form({ date: '2026-06-17', recipeId: 'nope', roundsFired: '20' })),
    ).rejects.toThrow('errors.recipeNotFound')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('writes a full recipe snapshot onto the range log inside a transaction', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    await createRangeLog(form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.rangeLog.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.rangeLog.create.mock.calls[0][0].data).toMatchObject({
      recipeId: 'recipe-1',
      roundsFired: 20,
      recipeName: 'Test Load',
      caliber: '.308',
      chargeGr: 40,
      coal: 2.8,
      projectileBrand: 'Sierra',
      projectileType: 'GameKing',
      projectileWeightGr: 168,
      propellantBrand: 'Vihtavuori',
      propellantType: 'N140',
      primerBrand: 'CCI',
      primerType: 'LARGE_RIFLE',
      cartridgeBrand: 'Lapua',
      cartridgeCaliber: '.308',
      cartridgeWaterCapacityGr: 56.0,
      calculatedV0: 800,
      fillRate: 90,
    })
  })

  it('records null primer snapshot fields when the recipe uses no primer', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe({ primerId: null, primer: null }))
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    await createRangeLog(form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLog.create.mock.calls[0][0].data).toMatchObject({
      primerBrand: null,
      primerType: null,
    })
  })

  it('records null cartridge snapshot fields when the recipe links no cartridge', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe({ cartridgeId: null, cartridge: null }))
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    await createRangeLog(form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLog.create.mock.calls[0][0].data).toMatchObject({
      cartridgeBrand: null,
      cartridgeCaliber: null,
      cartridgeWaterCapacityGr: null,
    })
  })
})

describe('updateRangeLog', () => {
  it('re-snapshots the recipe when the linked recipe changes', async () => {
    // Existing session linked to recipe-old; the form submits recipe-1.
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-old' })
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())

    await updateRangeLog(
      'range-1',
      form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }),
    )

    expect(prismaMock.recipe.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.rangeLog.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.rangeLog.update.mock.calls[0][0].data).toMatchObject({
      recipeId: 'recipe-1',
      recipeName: 'Test Load',
      caliber: '.308',
      chargeGr: 40,
      coal: 2.8,
      cartridgeBrand: 'Lapua',
      cartridgeCaliber: '.308',
      cartridgeWaterCapacityGr: 56.0,
    })
  })

  it('preserves the frozen snapshot when the recipe link is unchanged', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })

    await updateRangeLog(
      'range-1',
      form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '25' }),
    )

    // It must not re-fetch the recipe (and therefore must not overwrite history).
    expect(prismaMock.recipe.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.rangeLog.update).toHaveBeenCalledTimes(1)
    const data = prismaMock.rangeLog.update.mock.calls[0][0].data
    expect(data).toMatchObject({ roundsFired: 25 })
    expect(data).not.toHaveProperty('recipeName')
    expect(data).not.toHaveProperty('chargeGr')
    expect(data).not.toHaveProperty('recipeId')
  })

  it('keeps the link and snapshot untouched when an empty recipeId is submitted', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })

    await updateRangeLog('range-1', form({ date: '2026-06-17', recipeId: '', roundsFired: '20' }))

    expect(prismaMock.recipe.findUnique).not.toHaveBeenCalled()
    const data = prismaMock.rangeLog.update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('recipeId')
    expect(data).not.toHaveProperty('recipeName')
  })

  it('allows re-linking a snapshot after the recipe was deleted (recipeId was null)', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: null })
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())

    await updateRangeLog(
      'range-1',
      form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }),
    )

    expect(prismaMock.recipe.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.rangeLog.update.mock.calls[0][0].data).toMatchObject({
      recipeId: 'recipe-1',
      recipeName: 'Test Load',
    })
  })
})

describe('createRangeLog — chronograph shots', () => {
  it('persists shot rows when a valid shots JSON is in FormData', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))

    await createRangeLog(fd)

    expect(prismaMock.rangeLogShot.createMany).toHaveBeenCalledTimes(1)
    const call = prismaMock.rangeLogShot.createMany.mock.calls[0][0]
    expect(call.data).toHaveLength(2)
    expect(call.data[0]).toMatchObject({ shotIndex: 1, velocity: 950.0, rangeLogId: 'range-1' })
    expect(call.data[1]).toMatchObject({ shotIndex: 2, velocity: 960.0, rangeLogId: 'range-1' })
  })

  it('does not create shots when no shots field is present', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    await createRangeLog(form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLogShot.createMany).not.toHaveBeenCalled()
  })

  it('overwrites the submitted aggregates with recomputed values from shots', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({
      date: '2026-06-17',
      recipeId: 'recipe-1',
      roundsFired: '2',
      velocityMin: '999',
      velocityMax: '999',
      velocityAvg: '999',
      extremeSpread: '999',
      stdDev: '999',
    })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))

    await createRangeLog(fd)

    const data = prismaMock.rangeLog.create.mock.calls[0][0].data
    expect(data.velocityMin).toBeCloseTo(950.0, 1)
    expect(data.velocityMax).toBeCloseTo(960.0, 1)
    expect(data.velocityAvg).toBeCloseTo(955.0, 1)
    expect(data.extremeSpread).toBeCloseTo(10.0, 1)
  })

  it('throws and does not write shots when the shots JSON is malformed', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', '{not json')

    await expect(createRangeLog(fd)).rejects.toThrow('errors.csvShotsInvalid')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('throws and does not write shots when the shots fail Zod validation', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', JSON.stringify([{ shotIndex: 1, velocity: -5 }]))

    await expect(createRangeLog(fd)).rejects.toThrow('errors.csvShotsInvalid')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

describe('updateRangeLog — chronograph shots', () => {
  it('replaces shots when replaceShots=true and shots are present', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })
    prismaMock.rangeLog.update.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))
    fd.set('replaceShots', 'true')

    await updateRangeLog('range-1', fd)

    expect(prismaMock.rangeLogShot.deleteMany).toHaveBeenCalledWith({ where: { rangeLogId: 'range-1' } })
    expect(prismaMock.rangeLogShot.createMany).toHaveBeenCalledTimes(1)
  })

  it('leaves existing shots untouched when no shots field is submitted', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })
    prismaMock.rangeLog.update.mockResolvedValue({ id: 'range-1' })

    await updateRangeLog('range-1', form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLogShot.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.rangeLogShot.createMany).not.toHaveBeenCalled()
  })

  it('deletes existing shots when replaceShots=true and no shots are submitted (remove case)', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })
    prismaMock.rangeLog.update.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' })
    fd.set('replaceShots', 'true')
    // No shots field — user clicked "Remove import"

    await updateRangeLog('range-1', fd)

    expect(prismaMock.rangeLogShot.deleteMany).toHaveBeenCalledWith({ where: { rangeLogId: 'range-1' } })
    expect(prismaMock.rangeLogShot.createMany).not.toHaveBeenCalled()
  })
})