import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
      projectile: { create: vi.fn(), findUnique: vi.fn() },
      propellant: { create: vi.fn(), findUnique: vi.fn() },
      caliber: { findFirst: vi.fn(), create: vi.fn() },
      aiSettings: { findUnique: vi.fn() },
      rangeLog: { count: vi.fn() },
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { deleteRecipe, importRecipeFromQuickLoad, extractQuickLoadFromImage } from './actions'
import type { QuickLoadImportData } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// A minimal valid PNG header (magic bytes) so getImageMimeType accepts it.
function pngFile(): File {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]
  return new File([new Uint8Array(header)], 'shot.png', { type: 'image/png' })
}

function formWithImage(file: File): FormData {
  const fd = new FormData()
  fd.set('image', file)
  return fd
}

function aiSettings(overrides: Record<string, unknown> = {}) {
  return {
    id: 'singleton',
    provider: 'grok',
    apiKey: 'key',
    model: 'grok-3',
    visionModel: 'grok-2-vision-1212',
    baseUrl: 'https://api.x.ai/v1',
    temperature: null,
    maxTokens: null,
    ...overrides,
  }
}

function visionResponse(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

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

function makeImportData(overrides: Partial<QuickLoadImportData> = {}): QuickLoadImportData {
  return {
    name: 'Test Recipe',
    caliber: '.308 Win',
    chargeGr: 40,
    coal: 2.8,
    calculatedV0: 800,
    measuredV0: null,
    fillRate: 90,
    notes: 'QuickLoad import',
    projectileId: 'proj-1',
    createProjectile: false,
    projectileBrand: 'Sierra',
    projectileType: 'GameKing',
    projectileWeightGr: 168,
    projectileCaliber: '.308',
    propellantId: 'prop-1',
    createPropellant: false,
    propellantBrand: 'Vihtavuori',
    propellantType: 'N140',
    ...overrides,
  }
}

describe('importRecipeFromQuickLoad', () => {
  beforeEach(() => {
    // resolveCaliberId find-or-create: default to an existing caliber row.
    prismaMock.caliber.findFirst.mockResolvedValue({ id: 'cal-308win', name: '.308 Win' })
  })

  it('creates a recipe with existing projectile and propellant IDs', async () => {
    prismaMock.recipe.create.mockResolvedValue({ id: 'recipe-1' })

    await importRecipeFromQuickLoad(makeImportData())

    expect(prismaMock.projectile.create).not.toHaveBeenCalled()
    expect(prismaMock.propellant.create).not.toHaveBeenCalled()
    expect(prismaMock.recipe.create).toHaveBeenCalledTimes(1)
    const data = prismaMock.recipe.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      name: 'Test Recipe',
      caliberId: 'cal-308win',
      projectileId: 'proj-1',
      propellantId: 'prop-1',
      chargeGr: 40,
      coal: 2.8,
      calculatedV0: 800,
      fillRate: 90,
      notes: 'QuickLoad import',
    })
  })

  it('creates a new projectile when createProjectile is true and no ID is provided', async () => {
    prismaMock.projectile.create.mockResolvedValue({ id: 'new-proj-1' })
    prismaMock.recipe.create.mockResolvedValue({ id: 'recipe-1' })

    await importRecipeFromQuickLoad(makeImportData({
      projectileId: null,
      createProjectile: true,
    }))

    expect(prismaMock.projectile.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.projectile.create.mock.calls[0][0].data).toMatchObject({
      brand: 'Sierra',
      type: 'GameKing',
      weightGr: 168,
      caliber: '.308',
      amount: 0,
    })
    expect(prismaMock.recipe.create.mock.calls[0][0].data.projectileId).toBe('new-proj-1')
  })

  it('creates a new propellant when createPropellant is true and no ID is provided', async () => {
    prismaMock.propellant.create.mockResolvedValue({ id: 'new-prop-1' })
    prismaMock.recipe.create.mockResolvedValue({ id: 'recipe-1' })

    await importRecipeFromQuickLoad(makeImportData({
      propellantId: null,
      createPropellant: true,
    }))

    expect(prismaMock.propellant.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.propellant.create.mock.calls[0][0].data).toMatchObject({
      brand: 'Vihtavuori',
      type: 'N140',
      amountGr: 0,
    })
    expect(prismaMock.recipe.create.mock.calls[0][0].data.propellantId).toBe('new-prop-1')
  })

  it('throws when name is missing', async () => {
    await expect(
      importRecipeFromQuickLoad(makeImportData({ name: '' })),
    ).rejects.toThrow()
    expect(prismaMock.recipe.create).not.toHaveBeenCalled()
  })

  it('throws when neither projectileId nor createProjectile is provided', async () => {
    await expect(
      importRecipeFromQuickLoad(makeImportData({ projectileId: null, createProjectile: false })),
    ).rejects.toThrow()
    expect(prismaMock.recipe.create).not.toHaveBeenCalled()
  })
})

describe('extractQuickLoadFromImage', () => {
  it('maps a well-formed model JSON response to a ParsedQuickLoad', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings())
    const modelJson = JSON.stringify({
      name: '.308 Win 168gr',
      caliber: '.308 Win',
      bulletBrand: 'Sierra',
      bulletType: 'MatchKing',
      bulletWeightGr: 168,
      bulletCaliber: '.308',
      propellantBrand: 'Vihtavuori',
      propellantType: 'N140',
      chargeGr: 42.5,
      coal: 2.8,
      calculatedV0: 800,
      measuredV0: null,
      fillRate: 95,
      notes: 'from screenshot',
    })
    const fetchMock = vi.fn((..._args: [string, RequestInit?]) => Promise.resolve(visionResponse(modelJson)))
    vi.stubGlobal('fetch', fetchMock)

    const parsed = await extractQuickLoadFromImage(formWithImage(pngFile()))

    expect(parsed).toMatchObject({
      name: '.308 Win 168gr',
      caliber: '.308 Win',
      bulletBrand: 'Sierra',
      bulletType: 'MatchKing',
      bulletWeightGr: 168,
      bulletCaliber: '.308',
      propellantBrand: 'Vihtavuori',
      propellantType: 'N140',
      chargeGr: 42.5,
      coal: 2.8,
      calculatedV0: 800,
      measuredV0: null,
      fillRate: 95,
    })
    // The configured vision model — not the text model — must be used.
    const init = fetchMock.mock.calls[0][1]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('grok-2-vision-1212')
  })

  it('throws when the AI is not configured (no API key)', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings({ apiKey: null }))
    vi.stubGlobal('fetch', vi.fn())
    await expect(extractQuickLoadFromImage(formWithImage(pngFile()))).rejects.toThrow()
  })

  it('throws when no vision model is set (no fallback to the text model)', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings({ visionModel: null }))
    const fetchMock = vi.fn(async () => visionResponse('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(extractQuickLoadFromImage(formWithImage(pngFile()))).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a non-image file', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings())
    vi.stubGlobal('fetch', vi.fn())
    const notImage = new File([new Uint8Array([1, 2, 3, 4])], 'notes.txt', { type: 'text/plain' })
    await expect(extractQuickLoadFromImage(formWithImage(notImage))).rejects.toThrow()
  })

  it('rejects when no file is provided', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings())
    vi.stubGlobal('fetch', vi.fn())
    await expect(extractQuickLoadFromImage(new FormData())).rejects.toThrow()
  })

  it('throws a friendly error when the model output is unparseable', async () => {
    prismaMock.aiSettings.findUnique.mockResolvedValue(aiSettings())
    vi.stubGlobal('fetch', vi.fn(async () => visionResponse('I could not read the image, sorry!')))
    await expect(extractQuickLoadFromImage(formWithImage(pngFile()))).rejects.toThrow()
  })
})