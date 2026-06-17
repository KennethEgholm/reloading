import { describe, it, expect, vi, beforeEach } from 'vitest'

// deleteRecipe previously blocked deletion whenever a RangeLog referenced the
// recipe (no snapshot to fall back on, RESTRICT FK). With a frozen snapshot on
// each log and a nullable, ON DELETE SET NULL FK, deletion simply nulls the
// pointers — so the in-use guard is gone. These tests pin that behavior.

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      recipe: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      rangeLog: { count: vi.fn() },
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { deleteRecipe } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteRecipe', () => {
  it('deletes the recipe even when range sessions reference it (snapshot + SET NULL)', async () => {
    // The old guard would have returned ok:false here. Now deletion proceeds:
    // the SET NULL FK nulls the range logs' recipeId and the snapshot survives.
    prismaMock.recipe.delete.mockResolvedValue({})

    const result = await deleteRecipe('recipe-1')

    expect(result).toEqual({ ok: true })
    expect(prismaMock.rangeLog.count).not.toHaveBeenCalled()
    expect(prismaMock.recipe.delete).toHaveBeenCalledWith({ where: { id: 'recipe-1' } })
  })

  it('deletes the recipe when nothing references it', async () => {
    prismaMock.recipe.delete.mockResolvedValue({})

    const result = await deleteRecipe('recipe-1')

    expect(result).toEqual({ ok: true })
    expect(prismaMock.recipe.delete).toHaveBeenCalledTimes(1)
  })
})