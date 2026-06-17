// End-to-end verification of the RangeLog snapshot model against the live DB.
//
// This exercises the REAL server actions (createRangeLog / updateRangeLog /
// deleteRecipe) — not a reimplementation — by mocking only the Next-only
// dependencies they pull in (next/cache, next/navigation, next-intl/server,
// fs/promises) and letting @/lib/prisma use the real Prisma client connected
// to the dev Postgres. Requires the add_range_log_snapshots migration to be
// applied and DATABASE_URL to point at that database.
//
// Run: DATABASE_URL=postgresql://reloading:reloading@localhost:5432/reloading \
//        pnpm vitest run --config vitest.verify.config.ts
//
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-intl/server', () => ({
  // Key-echo translator: validation messages are irrelevant here — we assert on
  // database state, not localized text.
  getTranslations: vi.fn(async () => (key: string) => key),
}))
// No images are uploaded in these flows, but the actions call mkdir
// unconditionally — stub it so nothing touches the real filesystem.
vi.mock('fs/promises', () => ({ writeFile: vi.fn(), mkdir: vi.fn(), unlink: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { createRangeLog, updateRangeLog } from '@/app/range/actions'
import { deleteRecipe } from '@/app/recipes/actions'

const TAG = 'verify-' + randomUUID()

type Snapshot = {
  recipeId: string | null
  recipeName: string | null
  caliber: string | null
  chargeGr: number | null
  coal: number | null
  projectileBrand: string | null
  projectileType: string | null
  projectileWeightGr: number | null
  propellantBrand: string | null
  propellantType: string | null
  primerBrand: string | null
  primerType: string | null
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
  roundsFired: number
  recipe: { id: string; name: string; chargeGr: number | null; coal: number | null } | null
}

const SNAPSHOT_SELECT = {
  recipeId: true,
  recipeName: true,
  caliber: true,
  chargeGr: true,
  coal: true,
  projectileBrand: true,
  projectileType: true,
  projectileWeightGr: true,
  propellantBrand: true,
  propellantType: true,
  primerBrand: true,
  primerType: true,
  calculatedV0: true,
  measuredV0: true,
  fillRate: true,
  roundsFired: true,
  recipe: { select: { id: true, name: true, chargeGr: true, coal: true } },
} as const

async function readLog(id: string): Promise<Snapshot> {
  const log = await prisma.rangeLog.findUnique({ where: { id }, select: SNAPSHOT_SELECT })
  if (!log) throw new Error(`range log ${id} not found`)
  return log as unknown as Snapshot
}

async function findLogIdByNotes(marker: string): Promise<string> {
  const log = await prisma.rangeLog.findFirst({
    where: { notes: marker },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!log) throw new Error(`no range log found with notes marker ${marker}`)
  return log.id
}

type Seed = {
  recipe: { id: string; name: string }
  projectile: { id: string }
  propellant: { id: string }
  primer: { id: string } | null
}

async function seedRecipe(name: string, chargeGr: number, coal: number, withPrimer = true): Promise<Seed> {
  const projectile = await prisma.projectile.create({
    data: { brand: `${TAG}-proj-${name}`, type: 'GameKing', weightGr: 168, caliber: '.308' },
  })
  const propellant = await prisma.propellant.create({
    data: { brand: `${TAG}-prop-${name}`, type: 'N140', amountGr: 1000 },
  })
  const primer = withPrimer
    ? await prisma.primer.create({ data: { brand: `${TAG}-prim-${name}`, type: 'LARGE_RIFLE', amount: 100 } })
    : null
  const recipe = await prisma.recipe.create({
    data: {
      name,
      caliber: '.308',
      chargeGr,
      coal,
      projectileId: projectile.id,
      propellantId: propellant.id,
      primerId: primer?.id ?? null,
      calculatedV0: 800,
      measuredV0: null,
      fillRate: 90,
    },
  })
  return { recipe, projectile, propellant, primer }
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

// Bookkeeping for teardown. Recipe FKs to components are RESTRICT, so recipes
// must be deleted before their components. RangeLog.recipeId is SET NULL, so
// deleting a recipe just nulls the pointer (handled by the action / cleanup).
const rangeLogIds: string[] = []
const recipeIds: string[] = []
const projectileIds: string[] = []
const propellantIds: string[] = []
const primerIds: string[] = []

async function safeDelete<T>(fn: () => Promise<T>, label: string) {
  try {
    await fn()
  } catch (e) {
    // Already deleted (e.g. recipe removed via deleteRecipe in a flow) — fine.
    void label
    void e
  }
}

afterAll(async () => {
  for (const id of rangeLogIds) await safeDelete(() => prisma.rangeLog.delete({ where: { id } }), 'rangeLog')
  for (const id of recipeIds) await safeDelete(() => prisma.recipe.delete({ where: { id } }), 'recipe')
  for (const id of primerIds) await safeDelete(() => prisma.primer.delete({ where: { id } }), 'primer')
  for (const id of projectileIds) await safeDelete(() => prisma.projectile.delete({ where: { id } }), 'projectile')
  for (const id of propellantIds) await safeDelete(() => prisma.propellant.delete({ where: { id } }), 'propellant')
  await prisma.$disconnect()
}, 60_000)

describe('RangeLog snapshot model (live DB)', () => {
  let rA: Seed
  let r3: Seed
  let r4: Seed

  beforeAll(async () => {
    rA = await seedRecipe(`${TAG}-A`, 40, 2.8, true)
    r3 = await seedRecipe(`${TAG}-R3`, 50, 3.0, true)
    r4 = await seedRecipe(`${TAG}-R4`, 55, 3.1, false) // no primer → tests null-primer snapshot path
    recipeIds.push(rA.recipe.id, r3.recipe.id, r4.recipe.id)
    projectileIds.push(rA.projectile.id, r3.projectile.id, r4.projectile.id)
    propellantIds.push(rA.propellant.id, r3.propellant.id, r4.propellant.id)
    for (const s of [rA, r3, r4]) if (s.primer) primerIds.push(s.primer.id)
  }, 60_000)

  it('flow A — snapshot is frozen: editing the recipe does NOT change the session record', async () => {
    const marker = `${TAG}-notes-A`
    // 1. Create a range session for recipe A.
    await createRangeLog(form({ date: '2026-06-17', recipeId: rA.recipe.id, roundsFired: '20', notes: marker }))
    const id = await findLogIdByNotes(marker)
    rangeLogIds.push(id)

    const immediately = await readLog(id)
    // Snapshot captured A's current values (charge 40, COAL 2.8, primer present).
    expect(immediately.recipeId).toBe(rA.recipe.id)
    expect(immediately.recipeName).toBe(`${TAG}-A`)
    expect(immediately.chargeGr).toBe(40)
    expect(immediately.coal).toBe(2.8)
    expect(immediately.projectileBrand).toBe(`${TAG}-proj-${TAG}-A`)
    expect(immediately.propellantType).toBe('N140')
    expect(immediately.primerBrand).toBe(`${TAG}-prim-${TAG}-A`)
    expect(immediately.primerType).toBe('LARGE_RIFLE')
    expect(immediately.calculatedV0).toBe(800)
    expect(immediately.fillRate).toBe(90)
    expect(immediately.roundsFired).toBe(20)

    // 2. Edit recipe A elsewhere (charge 40→44, COAL 2.8→2.9, rename).
    await prisma.recipe.update({
      where: { id: rA.recipe.id },
      data: { chargeGr: 44, coal: 2.9, name: `${TAG}-A-EDITED` },
    })

    // 3. Re-read the session: the live `recipe` reflects the edit, but the
    //    frozen snapshot is untouched.
    const after = await readLog(id)
    expect(after.recipe?.chargeGr).toBe(44) // live recipe moved
    expect(after.recipe?.coal).toBe(2.9)
    expect(after.recipe?.name).toBe(`${TAG}-A-EDITED`)
    // ...while the snapshot stayed frozen at creation time:
    expect(after.recipeName).toBe(`${TAG}-A`) // unchanged
    expect(after.chargeGr).toBe(40) // unchanged
    expect(after.coal).toBe(2.8) // unchanged
    expect(after.primerBrand).toBe(`${TAG}-prim-${TAG}-A`)
  }, 60_000)

  it('flow B — deleting the recipe nulls the FK but the snapshot survives', async () => {
    const marker = `${TAG}-notes-B`
    // Fresh session for recipe A (A still exists at this point in its edited state).
    await createRangeLog(form({ date: '2026-06-17', recipeId: rA.recipe.id, roundsFired: '10', notes: marker }))
    const id = await findLogIdByNotes(marker)
    rangeLogIds.push(id)
    expect((await readLog(id)).recipeId).toBe(rA.recipe.id)

    // Delete recipe A via the real action (the old in-use guard is gone).
    const result = await deleteRecipe(rA.recipe.id)
    expect(result).toEqual({ ok: true })

    // The session still exists, the FK is null, and the snapshot is intact.
    const after = await readLog(id)
    expect(after.recipeId).toBeNull()
    expect(after.recipe).toBeNull()
    expect(after.recipeName).toBe(`${TAG}-A-EDITED`) // whatever the recipe was named at deletion
    expect(after.chargeGr).toBe(44) // last live value at creation of THIS log (created after the edit)
    expect(after.coal).toBe(2.9)
    expect(after.projectileBrand).toBe(`${TAG}-proj-${TAG}-A`)
    expect(after.primerBrand).toBe(`${TAG}-prim-${TAG}-A`)

    // Mark recipe A as already removed so teardown doesn't double-delete.
    const idx = recipeIds.indexOf(rA.recipe.id)
    if (idx >= 0) recipeIds.splice(idx, 1)
  }, 60_000)

  it('flow C — switching the session recipe re-snapshots; leaving it unchanged preserves the snapshot', async () => {
    const marker = `${TAG}-notes-C`
    // Create a session linked to R3 (charge 50, COAL 3.0, with primer).
    await createRangeLog(form({ date: '2026-06-17', recipeId: r3.recipe.id, roundsFired: '5', notes: marker }))
    const id = await findLogIdByNotes(marker)
    rangeLogIds.push(id)

    const created = await readLog(id)
    expect(created.recipeId).toBe(r3.recipe.id)
    expect(created.chargeGr).toBe(50)
    expect(created.coal).toBe(3.0)
    expect(created.primerBrand).toBe(`${TAG}-prim-${TAG}-R3`)

    // 1. Re-link to R4 (charge 55, COAL 3.1, NO primer) → must re-snapshot.
    await updateRangeLog(id, form({ date: '2026-06-17', recipeId: r4.recipe.id, roundsFired: '5' }))
    const afterRelink = await readLog(id)
    expect(afterRelink.recipeId).toBe(r4.recipe.id)
    expect(afterRelink.recipeName).toBe(`${TAG}-R4`)
    expect(afterRelink.chargeGr).toBe(55) // updated to R4
    expect(afterRelink.coal).toBe(3.1)
    expect(afterRelink.primerBrand).toBeNull() // R4 has no primer
    expect(afterRelink.primerType).toBeNull()

    // 2. Edit the session WITHOUT changing recipeId → must NOT re-snapshot.
    //    (Simulates editing notes/photos — the frozen snapshot is preserved.)
    await updateRangeLog(id, form({ date: '2026-06-17', recipeId: r4.recipe.id, roundsFired: '99' }))
    const afterEdit = await readLog(id)
    expect(afterEdit.roundsFired).toBe(99) // mutable field updated
    expect(afterEdit.recipeId).toBe(r4.recipe.id) // unchanged
    expect(afterEdit.chargeGr).toBe(55) // snapshot preserved
    expect(afterEdit.coal).toBe(3.1)
    expect(afterEdit.recipeName).toBe(`${TAG}-R4`)

    // 3. Submit an empty recipeId → "leave the link as-is" (no re-snapshot).
    await updateRangeLog(id, form({ date: '2026-06-17', recipeId: '', roundsFired: '7' }))
    const afterEmpty = await readLog(id)
    expect(afterEmpty.roundsFired).toBe(7)
    expect(afterEmpty.recipeId).toBe(r4.recipe.id) // link preserved
    expect(afterEmpty.chargeGr).toBe(55) // snapshot preserved
  }, 60_000)
})