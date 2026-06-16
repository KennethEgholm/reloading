import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks for the action's external dependencies ----------------------------
//
// logs/actions.ts is a Server Action module. We exercise its pure orchestration
// logic (stock guards, deduction/restoration math, transaction usage, error
// propagation) against a mocked Prisma client — no database required.

// next/cache: revalidatePath is a side-effect we don't care about here.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// next-intl/server: return a translator that echoes the key so assertions can
// check which message fired without depending on locale content. Interpolation
// values are ignored.
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

// Hoisted Prisma mock so vi.mock (hoisted) can reference it.
const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      recipe: { findUnique: vi.fn() },
      loadLog: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
      projectile: { update: vi.fn() },
      primer: { update: vi.fn() },
      propellant: { update: vi.fn() },
      // $transaction(fn) runs the callback with the same mock acting as `tx`,
      // mirroring Prisma's interactive-transaction API. Rejections propagate.
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

// Import after mocks are registered.
import { createLoadLog, deleteLoadLog } from './actions'
import { GRAIN_TO_GRAM } from '@/lib/inventory'

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

// A fully-stocked recipe with a primer, charge 40 gr.
function makeRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recipe-1',
    name: 'Test Load',
    caliber: '.308',
    chargeGr: 40,
    calculatedV0: null,
    measuredV0: null,
    fillRate: null,
    projectileId: 'proj-1',
    propellantId: 'prop-1',
    primerId: 'prim-1',
    projectile: { id: 'proj-1', brand: 'Sierra', type: 'GameKing', weightGr: 168, amount: 1000 },
    propellant: { id: 'prop-1', brand: 'Vihtavuori', type: 'N140', amountGr: 1000 },
    primer: { id: 'prim-1', brand: 'CCI', type: 'LARGE_RIFLE', amount: 1000 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createLoadLog', () => {
  it('rejects an invalid payload before touching the database', async () => {
    await expect(createLoadLog(form({ recipeId: '', quantity: '0' }))).rejects.toThrow()
    expect(prismaMock.recipe.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('throws when the recipe is not found', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(null)
    await expect(createLoadLog(form({ recipeId: 'nope', quantity: '50' }))).rejects.toThrow(
      'errors.recipeNotFound',
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('throws when the recipe has no charge weight', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe({ chargeGr: null }))
    await expect(createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))).rejects.toThrow(
      'errors.noCharge',
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('deducts projectile, primer, and propellant in a single transaction', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    await createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.loadLog.create).toHaveBeenCalledTimes(1)

    // Projectile + primer decrement by the round count.
    expect(prismaMock.projectile.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { amount: { decrement: 50 } },
    })
    expect(prismaMock.primer.update).toHaveBeenCalledWith({
      where: { id: 'prim-1' },
      data: { amount: { decrement: 50 } },
    })

    // Propellant decrement = rounds * charge(gr) * GRAIN_TO_GRAM.
    expect(prismaMock.propellant.update).toHaveBeenCalledWith({
      where: { id: 'prop-1' },
      data: { amountGr: { decrement: 50 * 40 * GRAIN_TO_GRAM } },
    })
  })

  it('writes a full recipe/component snapshot onto the log', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    await createLoadLog(form({ recipeId: 'recipe-1', quantity: '10', notes: 'first batch' }))

    const arg = prismaMock.loadLog.create.mock.calls[0][0]
    expect(arg.data).toMatchObject({
      recipeId: 'recipe-1',
      quantity: 10,
      notes: 'first batch',
      recipeName: 'Test Load',
      caliber: '.308',
      chargeGr: 40,
      projectileBrand: 'Sierra',
      propellantBrand: 'Vihtavuori',
      primerBrand: 'CCI',
      projectileId: 'proj-1',
      propellantId: 'prop-1',
      primerId: 'prim-1',
    })
  })

  it('does not deduct a primer when the recipe uses none', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(
      makeRecipe({ primerId: null, primer: null }),
    )
    await createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))

    expect(prismaMock.primer.update).not.toHaveBeenCalled()
    expect(prismaMock.projectile.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.propellant.update).toHaveBeenCalledTimes(1)
    // Snapshot records null primer fields.
    expect(prismaMock.loadLog.create.mock.calls[0][0].data).toMatchObject({
      primerBrand: null,
      primerType: null,
    })
  })

  it('blocks the load and deducts nothing when projectile stock is insufficient', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(
      makeRecipe({ projectile: { id: 'proj-1', brand: 'Sierra', type: 'GameKing', weightGr: 168, amount: 10 } }),
    )
    await expect(createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))).rejects.toThrow(
      'errors.insufficientProjectiles',
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.projectile.update).not.toHaveBeenCalled()
  })

  it('blocks the load when propellant grams are insufficient', async () => {
    // 50 * 40 gr = 2000 gr → ~129.6 g needed; only 100 g on hand.
    prismaMock.recipe.findUnique.mockResolvedValue(
      makeRecipe({ propellant: { id: 'prop-1', brand: 'Vihtavuori', type: 'N140', amountGr: 100 } }),
    )
    await expect(createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))).rejects.toThrow(
      'errors.insufficientPropellant',
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('propagates a mid-transaction failure to the caller', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.propellant.update.mockRejectedValueOnce(new Error('db exploded'))
    await expect(createLoadLog(form({ recipeId: 'recipe-1', quantity: '50' }))).rejects.toThrow(
      'db exploded',
    )
    // The transaction was entered (so a real DB would roll back the partial writes).
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('deleteLoadLog', () => {
  function makeLog(overrides: Record<string, unknown> = {}) {
    return {
      id: 'log-1',
      quantity: 50,
      chargeGr: 40,
      projectileId: 'proj-1',
      propellantId: 'prop-1',
      primerId: 'prim-1',
      ...overrides,
    }
  }

  it('throws when the log is not found', async () => {
    prismaMock.loadLog.findUnique.mockResolvedValue(null)
    await expect(deleteLoadLog('nope')).rejects.toThrow('errors.notFound')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('restores all three components and deletes the log in one transaction', async () => {
    prismaMock.loadLog.findUnique.mockResolvedValue(makeLog())
    await deleteLoadLog('log-1')

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.projectile.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { amount: { increment: 50 } },
    })
    expect(prismaMock.primer.update).toHaveBeenCalledWith({
      where: { id: 'prim-1' },
      data: { amount: { increment: 50 } },
    })
    expect(prismaMock.propellant.update).toHaveBeenCalledWith({
      where: { id: 'prop-1' },
      data: { amountGr: { increment: 50 * 40 * GRAIN_TO_GRAM } },
    })
    expect(prismaMock.loadLog.delete).toHaveBeenCalledWith({ where: { id: 'log-1' } })
  })

  it('restores deduction and restoration symmetrically (same grams)', async () => {
    // The grams restored on delete must equal the grams deducted on create
    // for the same quantity + charge, or stock drifts over a create/delete cycle.
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    await createLoadLog(form({ recipeId: 'recipe-1', quantity: '37' }))
    const deducted = prismaMock.propellant.update.mock.calls[0][0].data.amountGr.decrement

    vi.clearAllMocks()
    prismaMock.loadLog.findUnique.mockResolvedValue(makeLog({ quantity: 37 }))
    await deleteLoadLog('log-1')
    const restored = prismaMock.propellant.update.mock.calls[0][0].data.amountGr.increment

    expect(restored).toBe(deducted)
  })

  it('skips primer restoration when the log used no primer', async () => {
    prismaMock.loadLog.findUnique.mockResolvedValue(makeLog({ primerId: null }))
    await deleteLoadLog('log-1')

    expect(prismaMock.primer.update).not.toHaveBeenCalled()
    expect(prismaMock.projectile.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.loadLog.delete).toHaveBeenCalledTimes(1)
  })

  it('does not restore propellant when the log had no charge snapshot', async () => {
    prismaMock.loadLog.findUnique.mockResolvedValue(makeLog({ chargeGr: null }))
    await deleteLoadLog('log-1')

    expect(prismaMock.propellant.update).not.toHaveBeenCalled()
    // Projectile + primer still restored; log still deleted.
    expect(prismaMock.projectile.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.loadLog.delete).toHaveBeenCalledTimes(1)
  })
})
