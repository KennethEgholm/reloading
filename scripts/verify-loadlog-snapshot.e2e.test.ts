// End-to-end verification of the LoadLog snapshot model against the live DB.
//
// This exercises the REAL server action (createLoadLog) — not a reimplementation —
// by mocking only the Next-only dependencies it pulls in (next/cache,
// next-intl/server) and letting @/lib/prisma use the real Prisma client connected
// to the dev Postgres. Requires the add_load_log_coal_cartridge_snapshot migration
// to be applied and DATABASE_URL to point at that database.
//
// Run: DATABASE_URL=postgresql://reloading:reloading@localhost:5432/reloading \
//        pnpm vitest run --config vitest.verify.config.ts
//
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// createLoadLog doesn't redirect or touch the filesystem, but stub the modules
// its neighbors pull in so a shared mock setup stays harmless here.
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-intl/server', () => ({
  // Key-echo translator: validation messages are irrelevant here — we assert on
  // database state, not localized text.
  getTranslations: vi.fn(async () => (key: string) => key),
}))
vi.mock('fs/promises', () => ({ writeFile: vi.fn(), mkdir: vi.fn(), unlink: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { createLoadLog } from '@/app/logs/actions'

const TAG = 'verify-' + randomUUID()

type Snapshot = {
  recipeId: string | null
  recipeName: string | null
  caliber: string | null
  chargeGr: number | null
  coal: number | null
  projectileBrand: string | null
  propellantBrand: string | null
  primerBrand: string | null
  primerType: string | null
  cartridgeBrand: string | null
  cartridgeCaliber: string | null
  cartridgeWaterCapacityGr: number | null
  quantity: number
  recipe: { id: string; name: string; chargeGr: number | null; coal: number | null } | null
}

const SNAPSHOT_SELECT = {
  recipeId: true,
  recipeName: true,
  caliber: true,
  chargeGr: true,
  coal: true,
  projectileBrand: true,
  propellantBrand: true,
  primerBrand: true,
  primerType: true,
  cartridgeBrand: true,
  cartridgeCaliber: true,
  cartridgeWaterCapacityGr: true,
  quantity: true,
  recipe: { select: { id: true, name: true, chargeGr: true, coal: true } },
} as const

async function readLog(id: string): Promise<Snapshot> {
  const log = await prisma.loadLog.findUnique({ where: { id }, select: SNAPSHOT_SELECT })
  if (!log) throw new Error(`load log ${id} not found`)
  return log as unknown as Snapshot
}

async function findLogIdByNotes(marker: string): Promise<string> {
  const log = await prisma.loadLog.findFirst({
    where: { notes: marker },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  if (!log) throw new Error(`no load log found with notes marker ${marker}`)
  return log.id
}

type Seed = {
  recipe: { id: string; name: string }
  projectile: { id: string }
  propellant: { id: string }
  primer: { id: string }
  cartridge: { id: string } | null
}

// Seeds a fully-stocked recipe (charge + COAL + primer, optionally a cartridge).
// Component stock is sized well above what the loads below consume.
async function seedRecipe(name: string, chargeGr: number, coal: number, withCartridge = true): Promise<Seed> {
  const projectile = await prisma.projectile.create({
    data: { brand: `${TAG}-proj-${name}`, type: 'GameKing', weightGr: 168, caliber: '.308', amount: 1000 },
  })
  const propellant = await prisma.propellant.create({
    data: { brand: `${TAG}-prop-${name}`, type: 'N140', amountGr: 10000 },
  })
  const primer = await prisma.primer.create({
    data: { brand: `${TAG}-prim-${name}`, type: 'LARGE_RIFLE', amount: 1000 },
  })
  const caliber = await prisma.caliber.upsert({
    where: { name: '.308' }, create: { name: '.308' }, update: {},
  })
  const cartridge = withCartridge
    ? await prisma.cartridge.create({
        data: { brand: `${TAG}-cart-${name}`, caliberId: caliber.id, waterCapacityGr: 56.0, amount: 100 },
      })
    : null
  const recipe = await prisma.recipe.create({
    data: {
      name,
      caliberId: caliber.id,
      chargeGr,
      coal,
      projectileId: projectile.id,
      propellantId: propellant.id,
      primerId: primer.id,
      cartridgeId: cartridge?.id ?? null,
    },
  })
  return { recipe, projectile, propellant, primer, cartridge }
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

// Bookkeeping for teardown. Recipe FKs to components are RESTRICT, so recipes must
// be deleted before their components. LoadLog has no cartridge FK (the cartridge
// snapshot is denormalized), so cartridges can go once no recipe references them.
const loadLogIds: string[] = []
const recipeIds: string[] = []
const projectileIds: string[] = []
const propellantIds: string[] = []
const primerIds: string[] = []
const cartridgeIds: string[] = []

async function safeDelete<T>(fn: () => Promise<T>, label: string) {
  try {
    await fn()
  } catch (e) {
    void label
    void e
  }
}

afterAll(async () => {
  for (const id of loadLogIds) await safeDelete(() => prisma.loadLog.delete({ where: { id } }), 'loadLog')
  for (const id of recipeIds) await safeDelete(() => prisma.recipe.delete({ where: { id } }), 'recipe')
  for (const id of primerIds) await safeDelete(() => prisma.primer.delete({ where: { id } }), 'primer')
  for (const id of projectileIds) await safeDelete(() => prisma.projectile.delete({ where: { id } }), 'projectile')
  for (const id of propellantIds) await safeDelete(() => prisma.propellant.delete({ where: { id } }), 'propellant')
  for (const id of cartridgeIds) await safeDelete(() => prisma.cartridge.delete({ where: { id } }), 'cartridge')
  await prisma.$disconnect()
}, 60_000)

describe('LoadLog snapshot model (live DB)', () => {
  let rA: Seed
  let rB: Seed

  beforeAll(async () => {
    rA = await seedRecipe(`${TAG}-A`, 40, 2.8, true)
    rB = await seedRecipe(`${TAG}-B`, 42, 3.0, false) // no cartridge → tests null-cartridge snapshot path
    recipeIds.push(rA.recipe.id, rB.recipe.id)
    projectileIds.push(rA.projectile.id, rB.projectile.id)
    propellantIds.push(rA.propellant.id, rB.propellant.id)
    primerIds.push(rA.primer.id, rB.primer.id)
    for (const s of [rA, rB]) if (s.cartridge) cartridgeIds.push(s.cartridge.id)
  }, 60_000)

  it('flow A — snapshot is frozen: editing the recipe does NOT change the load record (incl. COAL + cartridge)', async () => {
    const marker = `${TAG}-notes-A`
    // 1. Log a load against recipe A (charge 40, COAL 2.8, with cartridge).
    await createLoadLog(form({ recipeId: rA.recipe.id, quantity: '10', date: '2026-06-17', notes: marker }))
    const id = await findLogIdByNotes(marker)
    loadLogIds.push(id)

    const immediately = await readLog(id)
    // Snapshot captured A's current values (charge 40, COAL 2.8, cartridge present).
    expect(immediately.recipeId).toBe(rA.recipe.id)
    expect(immediately.recipeName).toBe(`${TAG}-A`)
    expect(immediately.chargeGr).toBe(40)
    expect(immediately.coal).toBe(2.8)
    expect(immediately.projectileBrand).toBe(`${TAG}-proj-${TAG}-A`)
    expect(immediately.propellantBrand).toBe(`${TAG}-prop-${TAG}-A`)
    expect(immediately.primerBrand).toBe(`${TAG}-prim-${TAG}-A`)
    expect(immediately.primerType).toBe('LARGE_RIFLE')
    expect(immediately.cartridgeBrand).toBe(`${TAG}-cart-${TAG}-A`)
    expect(immediately.cartridgeCaliber).toBe('.308')
    expect(immediately.cartridgeWaterCapacityGr).toBe(56.0)
    expect(immediately.quantity).toBe(10)

    // 2. Edit recipe A elsewhere (charge 40→44, COAL 2.8→2.9, rename, swap cartridge).
    const cal2 = await prisma.caliber.upsert({ where: { name: '6.5 Creedmoor' }, create: { name: '6.5 Creedmoor' }, update: {} })
    const newCart = await prisma.cartridge.create({
      data: { brand: `${TAG}-cart2-A`, caliberId: cal2.id, waterCapacityGr: 58.0, amount: 50 },
    })
    cartridgeIds.push(newCart.id)
    await prisma.recipe.update({
      where: { id: rA.recipe.id },
      data: { chargeGr: 44, coal: 2.9, name: `${TAG}-A-EDITED`, cartridgeId: newCart.id },
    })

    // 3. Re-read the load log: the live `recipe` reflects the edit, but the frozen
    //    snapshot (charge, COAL, cartridge) is untouched.
    const after = await readLog(id)
    expect(after.recipe?.chargeGr).toBe(44) // live recipe moved
    expect(after.recipe?.coal).toBe(2.9)
    expect(after.recipe?.name).toBe(`${TAG}-A-EDITED`)
    // ...while the snapshot stayed frozen at load time:
    expect(after.recipeName).toBe(`${TAG}-A`) // unchanged
    expect(after.chargeGr).toBe(40) // unchanged
    expect(after.coal).toBe(2.8) // unchanged
    expect(after.cartridgeBrand).toBe(`${TAG}-cart-${TAG}-A`) // original cartridge frozen
    expect(after.cartridgeCaliber).toBe('.308')
    expect(after.cartridgeWaterCapacityGr).toBe(56.0)
  }, 60_000)

  it('flow B — snapshot records null cartridge fields when the recipe links none', async () => {
    const marker = `${TAG}-notes-B`
    // Log a load against recipe B (charge 42, COAL 3.0, NO cartridge).
    await createLoadLog(form({ recipeId: rB.recipe.id, quantity: '5', date: '2026-06-17', notes: marker }))
    const id = await findLogIdByNotes(marker)
    loadLogIds.push(id)

    const log = await readLog(id)
    expect(log.recipeId).toBe(rB.recipe.id)
    expect(log.chargeGr).toBe(42)
    expect(log.coal).toBe(3.0)
    expect(log.cartridgeBrand).toBeNull()
    expect(log.cartridgeCaliber).toBeNull()
    expect(log.cartridgeWaterCapacityGr).toBeNull()
  }, 60_000)
})