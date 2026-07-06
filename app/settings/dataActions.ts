'use server'

import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import { resolveCaliberId } from '@/lib/resolveCaliber'

// ──────────────────────────────────────────────────────────────────────────
// Inventory export / import (unchanged behavior, refactored helpers)
// ──────────────────────────────────────────────────────────────────────────

export interface InventoryExport {
  version: number
  exportedAt: string
  primers: { brand: string; type: string; magnum: boolean; amount: number; description: string | null }[]
  projectiles: { brand: string; type: string | null; weightGr: number; caliber: string; amount: number; description: string | null }[]
  propellants: { brand: string; type: string; amountGr: number; description: string | null }[]
  cartridges: { brand: string; caliber: string; waterCapacityGr: number | null; amount: number; description: string | null }[]
}

export async function exportInventory(): Promise<string> {
  const [primers, projectiles, propellants, cartridges] = await Promise.all([
    prisma.primer.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.projectile.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.propellant.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.cartridge.findMany({ include: { caliber: true }, orderBy: { createdAt: 'asc' } }),
  ])

  const data: InventoryExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    primers: primers.map((p) => ({
      brand: p.brand,
      type: p.type,
      magnum: p.magnum,
      amount: p.amount,
      description: p.description,
    })),
    projectiles: projectiles.map((p) => ({
      brand: p.brand,
      type: p.type,
      weightGr: p.weightGr,
      caliber: p.caliber,
      amount: p.amount,
      description: p.description,
    })),
    propellants: propellants.map((p) => ({
      brand: p.brand,
      type: p.type,
      amountGr: p.amountGr,
      description: p.description,
    })),
    cartridges: cartridges.map((c) => ({
      brand: c.brand,
      caliber: c.caliber.name,
      waterCapacityGr: c.waterCapacityGr,
      amount: c.amount,
      description: c.description,
    })),
  }

  return JSON.stringify(data, null, 2)
}

export interface ImportPreview {
  primers: { created: number; updated: number }
  projectiles: { created: number; updated: number }
  propellants: { created: number; updated: number }
  cartridges: { created: number; updated: number }
}

export async function previewInventoryImport(jsonString: string): Promise<ImportPreview> {
  const data = parseExport(jsonString, ['primers', 'projectiles', 'propellants', 'cartridges']) as InventoryExport

  const [existingPrimers, existingProjectiles, existingPropellants, existingCartridges] = await Promise.all([
    prisma.primer.findMany(),
    prisma.projectile.findMany(),
    prisma.propellant.findMany(),
    prisma.cartridge.findMany({ include: { caliber: true } }),
  ])

  return {
    primers: countMatchExisting(data.primers, existingPrimers, (i) => i.brand + '|' + i.type, (e) => e.brand + '|' + e.type),
    projectiles: countMatchExisting(data.projectiles, existingProjectiles, (i) => i.brand + '|' + i.caliber, (e) => e.brand + '|' + e.caliber),
    propellants: countMatchExisting(data.propellants, existingPropellants, (i) => i.brand + '|' + i.type, (e) => e.brand + '|' + e.type),
    cartridges: countMatchExisting(data.cartridges, existingCartridges, (i) => i.brand + '|' + i.caliber, (e) => e.brand + '|' + e.caliber.name),
  }
}

export async function executeInventoryImport(jsonString: string): Promise<ImportPreview> {
  const t = await getTranslations('settings')
  const data = parseExport(jsonString, ['primers', 'projectiles', 'propellants', 'cartridges']) as InventoryExport

  const [existingPrimers, existingProjectiles, existingPropellants, existingCartridges] = await Promise.all([
    prisma.primer.findMany(),
    prisma.projectile.findMany(),
    prisma.propellant.findMany(),
    prisma.cartridge.findMany({ include: { caliber: true } }),
  ])

  const primerMap = new Map(existingPrimers.map((p) => [p.brand + '|' + p.type, p]))
  const projectileMap = new Map(existingProjectiles.map((p) => [p.brand + '|' + p.caliber, p]))
  const propellantMap = new Map(existingPropellants.map((p) => [p.brand + '|' + p.type, p]))
  const cartridgeMap = new Map(existingCartridges.map((c) => [c.brand + '|' + c.caliber.name, c]))

  let primerCreated = 0, primerUpdated = 0
  let projectileCreated = 0, projectileUpdated = 0
  let propellantCreated = 0, propellantUpdated = 0
  let cartridgeCreated = 0, cartridgeUpdated = 0

  for (const item of data.primers) {
    const key = item.brand + '|' + item.type
    const existing = primerMap.get(key)
    if (existing) {
      await prisma.primer.update({ where: { id: existing.id }, data: { amount: item.amount, magnum: item.magnum, description: item.description } })
      primerUpdated++
    } else {
      await prisma.primer.create({ data: { brand: item.brand, type: item.type as never, magnum: item.magnum, amount: item.amount, description: item.description } })
      primerCreated++
    }
  }

  for (const item of data.projectiles) {
    const key = item.brand + '|' + item.caliber
    const existing = projectileMap.get(key)
    if (existing) {
      await prisma.projectile.update({ where: { id: existing.id }, data: { type: item.type, weightGr: item.weightGr, amount: item.amount, description: item.description } })
      projectileUpdated++
    } else {
      await prisma.projectile.create({ data: { brand: item.brand, type: item.type, weightGr: item.weightGr, caliber: item.caliber, amount: item.amount, description: item.description } })
      projectileCreated++
    }
  }

  for (const item of data.propellants) {
    const key = item.brand + '|' + item.type
    const existing = propellantMap.get(key)
    if (existing) {
      await prisma.propellant.update({ where: { id: existing.id }, data: { amountGr: item.amountGr, description: item.description } })
      propellantUpdated++
    } else {
      await prisma.propellant.create({ data: { brand: item.brand, type: item.type, amountGr: item.amountGr, description: item.description } })
      propellantCreated++
    }
  }

  for (const item of data.cartridges) {
    const key = item.brand + '|' + item.caliber
    const existing = cartridgeMap.get(key)
    if (existing) {
      await prisma.cartridge.update({ where: { id: existing.id }, data: { waterCapacityGr: item.waterCapacityGr, amount: item.amount, description: item.description } })
      cartridgeUpdated++
    } else {
      const caliberId = await resolveCaliberId(item.caliber)
      await prisma.cartridge.create({ data: { brand: item.brand, caliberId, waterCapacityGr: item.waterCapacityGr, amount: item.amount, description: item.description } })
      cartridgeCreated++
    }
  }

  revalidatePath('/primers')
  revalidatePath('/projectiles')
  revalidatePath('/propellants')
  revalidatePath('/cartridges')
  revalidatePath('/')

  return {
    primers: { created: primerCreated, updated: primerUpdated },
    projectiles: { created: projectileCreated, updated: projectileUpdated },
    propellants: { created: propellantCreated, updated: propellantUpdated },
    cartridges: { created: cartridgeCreated, updated: cartridgeUpdated },
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Recipes export / import
// ──────────────────────────────────────────────────────────────────────────

export interface RecipeExportItem {
  name: string
  caliber: string
  chargeGr: number | null
  coal: number | null
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
  notes: string | null
  primer: { brand: string; type: string; magnum: boolean } | null
  projectile: { brand: string; caliber: string; type: string | null; weightGr: number }
  propellant: { brand: string; type: string }
  cartridge: { brand: string; caliber: string; waterCapacityGr: number | null } | null
}

export interface RecipesExport {
  version: number
  exportedAt: string
  recipes: RecipeExportItem[]
}

export async function exportRecipes(): Promise<string> {
  const recipes = await prisma.recipe.findMany({
    include: {
      caliber: true,
      projectile: true,
      propellant: true,
      primer: true,
      cartridge: { include: { caliber: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const data: RecipesExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: recipes.map((r) => ({
      name: r.name,
      caliber: r.caliber.name,
      chargeGr: r.chargeGr,
      coal: r.coal,
      calculatedV0: r.calculatedV0,
      measuredV0: r.measuredV0,
      fillRate: r.fillRate,
      notes: r.notes,
      primer: r.primer ? { brand: r.primer.brand, type: r.primer.type, magnum: r.primer.magnum } : null,
      projectile: { brand: r.projectile.brand, caliber: r.projectile.caliber, type: r.projectile.type, weightGr: r.projectile.weightGr },
      propellant: { brand: r.propellant.brand, type: r.propellant.type },
      cartridge: r.cartridge ? { brand: r.cartridge.brand, caliber: r.cartridge.caliber.name, waterCapacityGr: r.cartridge.waterCapacityGr } : null,
    })),
  }

  return JSON.stringify(data, null, 2)
}

export interface RecipesImportPreview {
  recipes: { created: number; updated: number }
}

export async function previewRecipesImport(jsonString: string): Promise<RecipesImportPreview> {
  const data = parseExport(jsonString, ['recipes']) as RecipesExport
  const existing = await prisma.recipe.findMany({ include: { caliber: true } })
  const existingKeys = new Set(existing.map((r) => recipeKey(r.name, r.caliber.name)))
  let created = 0, updated = 0
  for (const r of data.recipes) {
    const key = recipeKey(r.name, r.caliber)
    if (existingKeys.has(key)) updated++
    else created++
  }
  return { recipes: { created, updated } }
}

export async function executeRecipesImport(jsonString: string): Promise<RecipesImportPreview> {
  const data = parseExport(jsonString, ['recipes']) as RecipesExport

  const existingRecipes = await prisma.recipe.findMany({ include: { caliber: true } })
  const existingPrimers = await prisma.primer.findMany()
  const existingProjectiles = await prisma.projectile.findMany()
  const existingPropellants = await prisma.propellant.findMany()
  const existingCartridges = await prisma.cartridge.findMany({ include: { caliber: true } })

  const recipeMap = new Map(existingRecipes.map((r) => [recipeKey(r.name, r.caliber.name), r]))

  let created = 0, updated = 0

  for (const item of data.recipes) {
    const caliberId = await resolveCaliberId(item.caliber)
    const projectileId = await resolveProjectile(item.projectile, existingProjectiles)
    const propellantId = await resolvePropellant(item.propellant, existingPropellants)
    const primerId = item.primer ? await resolvePrimer(item.primer, existingPrimers) : null
    const cartridgeId = item.cartridge ? await resolveCartridge(item.cartridge, existingCartridges) : null

    const recipeData = {
      name: item.name,
      caliberId,
      projectileId,
      propellantId,
      primerId,
      cartridgeId,
      chargeGr: item.chargeGr,
      coal: item.coal,
      calculatedV0: item.calculatedV0,
      measuredV0: item.measuredV0,
      fillRate: item.fillRate,
      notes: item.notes,
    }

    const key = recipeKey(item.name, item.caliber)
    const existing = recipeMap.get(key)
    if (existing) {
      // Reset AI verdict on update — imported recipe may differ from what was checked.
      await prisma.recipe.update({
        where: { id: existing.id },
        data: { ...recipeData, aiVerdict: null, aiSummary: null, aiConcerns: null, aiModel: null, aiCheckedAt: null },
      })
      updated++
    } else {
      await prisma.recipe.create({
        data: { ...recipeData },
      })
      created++
    }
  }

  revalidatePath('/recipes')
  revalidatePath('/')

  return { recipes: { created, updated } }
}

// ──────────────────────────────────────────────────────────────────────────
// Load logs export / import
// ──────────────────────────────────────────────────────────────────────────

export interface LoadLogExportItem {
  date: string
  quantity: number
  notes: string | null
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
  cartridgeBrand: string | null
  cartridgeCaliber: string | null
  cartridgeWaterCapacityGr: number | null
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
}

export interface LoadLogsExport {
  version: number
  exportedAt: string
  loadLogs: LoadLogExportItem[]
}

export async function exportLoadLogs(): Promise<string> {
  const logs = await prisma.loadLog.findMany({ orderBy: { date: 'asc' } })

  const data: LoadLogsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    loadLogs: logs.map((l) => ({
      date: l.date.toISOString(),
      quantity: l.quantity,
      notes: l.notes,
      recipeName: l.recipeName,
      caliber: l.caliber,
      chargeGr: l.chargeGr,
      coal: l.coal,
      projectileBrand: l.projectileBrand,
      projectileType: l.projectileType,
      projectileWeightGr: l.projectileWeightGr,
      propellantBrand: l.propellantBrand,
      propellantType: l.propellantType,
      primerBrand: l.primerBrand,
      primerType: l.primerType,
      cartridgeBrand: l.cartridgeBrand,
      cartridgeCaliber: l.cartridgeCaliber,
      cartridgeWaterCapacityGr: l.cartridgeWaterCapacityGr,
      calculatedV0: l.calculatedV0,
      measuredV0: l.measuredV0,
      fillRate: l.fillRate,
    })),
  }

  return JSON.stringify(data, null, 2)
}

export interface LoadLogsImportPreview {
  loadLogs: { created: number; updated: number }
}

export async function previewLoadLogsImport(jsonString: string): Promise<LoadLogsImportPreview> {
  const data = parseExport(jsonString, ['loadLogs']) as LoadLogsExport
  const existing = await prisma.loadLog.findMany()
  const existingKeys = new Set(existing.map((l) => loadLogKey(l.date, l.recipeName, l.quantity)))
  let created = 0, updated = 0
  for (const l of data.loadLogs) {
    const key = loadLogKey(new Date(l.date), l.recipeName, l.quantity)
    if (existingKeys.has(key)) updated++
    else created++
  }
  return { loadLogs: { created, updated } }
}

export async function executeLoadLogsImport(jsonString: string): Promise<LoadLogsImportPreview> {
  const data = parseExport(jsonString, ['loadLogs']) as LoadLogsExport

  const existingLogs = await prisma.loadLog.findMany()
  const existingRecipes = await prisma.recipe.findMany({ include: { caliber: true } })
  const logMap = new Map(existingLogs.map((l) => [loadLogKey(l.date, l.recipeName, l.quantity), l]))

  let created = 0, updated = 0

  for (const item of data.loadLogs) {
    const date = new Date(item.date)
    const key = loadLogKey(date, item.recipeName, item.quantity)
    const recipeId = linkRecipe(item.recipeName, item.caliber, existingRecipes)

    // Snapshot fields from the file are authoritative (data-integrity rule).
    // Non-snapshot fields (quantity, notes, recipeId) are written; quantity
    // is part of the key so unchanged on update.
    const snapshotData = {
      recipeName: item.recipeName,
      caliber: item.caliber,
      chargeGr: item.chargeGr,
      coal: item.coal,
      projectileBrand: item.projectileBrand,
      projectileType: item.projectileType,
      projectileWeightGr: item.projectileWeightGr,
      propellantBrand: item.propellantBrand,
      propellantType: item.propellantType,
      primerBrand: item.primerBrand,
      primerType: item.primerType,
      cartridgeBrand: item.cartridgeBrand,
      cartridgeCaliber: item.cartridgeCaliber,
      cartridgeWaterCapacityGr: item.cartridgeWaterCapacityGr,
      calculatedV0: item.calculatedV0,
      measuredV0: item.measuredV0,
      fillRate: item.fillRate,
    }

    const existing = logMap.get(key)
    if (existing) {
      await prisma.loadLog.update({
        where: { id: existing.id },
        data: {
          notes: item.notes,
          recipeId,
          ...snapshotData,
        },
      })
      updated++
    } else {
      await prisma.loadLog.create({
        data: {
          date,
          quantity: item.quantity,
          notes: item.notes,
          recipeId,
          ...snapshotData,
        },
      })
      created++
    }
  }

  revalidatePath('/logs')
  revalidatePath('/')

  return { loadLogs: { created, updated } }
}

// ──────────────────────────────────────────────────────────────────────────
// Range logs export / import (photos skipped)
// ──────────────────────────────────────────────────────────────────────────

export interface RangeLogShotExport {
  shotIndex: number
  velocity: number
}

export interface RangeGroupExport {
  distanceM: number
  shotCount: number
  groupSizeMm: number
  moa: number
  notes: string | null
}

export interface RangeLogExportItem {
  date: string
  location: string | null
  conditions: string | null
  roundsFired: number
  velocityMin: number | null
  velocityMax: number | null
  velocityAvg: number | null
  extremeSpread: number | null
  stdDev: number | null
  notes: string | null
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
  cartridgeBrand: string | null
  cartridgeCaliber: string | null
  cartridgeWaterCapacityGr: number | null
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
  shots: RangeLogShotExport[]
  groups: RangeGroupExport[]
}

export interface RangeLogsExport {
  version: number
  exportedAt: string
  rangeLogs: RangeLogExportItem[]
}

export async function exportRangeLogs(): Promise<string> {
  const logs = await prisma.rangeLog.findMany({
    include: {
      shots: { orderBy: { shotIndex: 'asc' } },
      groups: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { date: 'asc' },
  })

  const data: RangeLogsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rangeLogs: logs.map((l) => ({
      date: l.date.toISOString(),
      location: l.location,
      conditions: l.conditions,
      roundsFired: l.roundsFired,
      velocityMin: l.velocityMin,
      velocityMax: l.velocityMax,
      velocityAvg: l.velocityAvg,
      extremeSpread: l.extremeSpread,
      stdDev: l.stdDev,
      notes: l.notes,
      recipeName: l.recipeName,
      caliber: l.caliber,
      chargeGr: l.chargeGr,
      coal: l.coal,
      projectileBrand: l.projectileBrand,
      projectileType: l.projectileType,
      projectileWeightGr: l.projectileWeightGr,
      propellantBrand: l.propellantBrand,
      propellantType: l.propellantType,
      primerBrand: l.primerBrand,
      primerType: l.primerType,
      cartridgeBrand: l.cartridgeBrand,
      cartridgeCaliber: l.cartridgeCaliber,
      cartridgeWaterCapacityGr: l.cartridgeWaterCapacityGr,
      calculatedV0: l.calculatedV0,
      measuredV0: l.measuredV0,
      fillRate: l.fillRate,
      shots: l.shots.map((s) => ({ shotIndex: s.shotIndex, velocity: s.velocity })),
      groups: l.groups.map((g) => ({
        distanceM: g.distanceM,
        shotCount: g.shotCount,
        groupSizeMm: g.groupSizeMm,
        moa: g.moa,
        notes: g.notes,
      })),
    })),
  }

  return JSON.stringify(data, null, 2)
}

export interface RangeLogsImportPreview {
  rangeLogs: { created: number; updated: number }
}

export async function previewRangeLogsImport(jsonString: string): Promise<RangeLogsImportPreview> {
  const data = parseExport(jsonString, ['rangeLogs']) as RangeLogsExport
  const existing = await prisma.rangeLog.findMany()
  const existingKeys = new Set(existing.map((l) => rangeLogKey(l.date, l.location, l.recipeName)))
  let created = 0, updated = 0
  for (const l of data.rangeLogs) {
    const key = rangeLogKey(new Date(l.date), l.location, l.recipeName)
    if (existingKeys.has(key)) updated++
    else created++
  }
  return { rangeLogs: { created, updated } }
}

export async function executeRangeLogsImport(jsonString: string): Promise<RangeLogsImportPreview> {
  const data = parseExport(jsonString, ['rangeLogs']) as RangeLogsExport

  const existingLogs = await prisma.rangeLog.findMany({ include: { shots: true } })
  const existingRecipes = await prisma.recipe.findMany({ include: { caliber: true } })
  const logMap = new Map(existingLogs.map((l) => [rangeLogKey(l.date, l.location, l.recipeName), l]))

  let created = 0, updated = 0

  for (const item of data.rangeLogs) {
    const date = new Date(item.date)
    const key = rangeLogKey(date, item.location, item.recipeName)
    const recipeId = linkRecipe(item.recipeName, item.caliber, existingRecipes)

    const snapshotData = {
      recipeName: item.recipeName,
      caliber: item.caliber,
      chargeGr: item.chargeGr,
      coal: item.coal,
      projectileBrand: item.projectileBrand,
      projectileType: item.projectileType,
      projectileWeightGr: item.projectileWeightGr,
      propellantBrand: item.propellantBrand,
      propellantType: item.propellantType,
      primerBrand: item.primerBrand,
      primerType: item.primerType,
      cartridgeBrand: item.cartridgeBrand,
      cartridgeCaliber: item.cartridgeCaliber,
      cartridgeWaterCapacityGr: item.cartridgeWaterCapacityGr,
      calculatedV0: item.calculatedV0,
      measuredV0: item.measuredV0,
      fillRate: item.fillRate,
    }

    const baseData = {
      date,
      location: item.location,
      conditions: item.conditions,
      roundsFired: item.roundsFired,
      velocityMin: item.velocityMin,
      velocityMax: item.velocityMax,
      velocityAvg: item.velocityAvg,
      extremeSpread: item.extremeSpread,
      stdDev: item.stdDev,
      notes: item.notes,
      recipeId,
      ...snapshotData,
    }

    const existing = logMap.get(key)
    if (existing) {
      // Replace shots + groups on update: delete existing, insert imported.
      await prisma.$transaction([
        prisma.rangeLogShot.deleteMany({ where: { rangeLogId: existing.id } }),
        prisma.rangeGroup.deleteMany({ where: { rangeLogId: existing.id } }),
        prisma.rangeLog.update({ where: { id: existing.id }, data: baseData }),
        ...(item.shots.length > 0
          ? [prisma.rangeLogShot.createMany({ data: item.shots.map((s) => ({ ...s, rangeLogId: existing.id })) })]
          : []),
        ...(item.groups.length > 0
          ? [prisma.rangeGroup.createMany({ data: item.groups.map((g) => ({ ...g, rangeLogId: existing.id })) })]
          : []),
      ])
      updated++
    } else {
      const createdLog = await prisma.rangeLog.create({ data: baseData })
      if (item.shots.length > 0) {
        await prisma.rangeLogShot.createMany({
          data: item.shots.map((s) => ({ ...s, rangeLogId: createdLog.id })),
        })
      }
      if (item.groups.length > 0) {
        await prisma.rangeGroup.createMany({
          data: item.groups.map((g) => ({ ...g, rangeLogId: createdLog.id })),
        })
      }
      created++
    }
  }

  revalidatePath('/range')
  revalidatePath('/')

  return { rangeLogs: { created, updated } }
}

// ──────────────────────────────────────────────────────────────────────────
// Combined "everything" export
// ──────────────────────────────────────────────────────────────────────────

export interface FullExport {
  version: number
  exportedAt: string
  inventory: InventoryExport
  recipes: RecipesExport
  loadLogs: LoadLogsExport
  rangeLogs: RangeLogsExport
}

export async function exportEverything(): Promise<string> {
  const [inventoryJson, recipesJson, loadLogsJson, rangeLogsJson] = await Promise.all([
    exportInventory(),
    exportRecipes(),
    exportLoadLogs(),
    exportRangeLogs(),
  ])
  const inventory = JSON.parse(inventoryJson) as InventoryExport
  const recipes = JSON.parse(recipesJson) as RecipesExport
  const loadLogs = JSON.parse(loadLogsJson) as LoadLogsExport
  const rangeLogs = JSON.parse(rangeLogsJson) as RangeLogsExport
  const full: FullExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    inventory,
    recipes,
    loadLogs,
    rangeLogs,
  }
  return JSON.stringify(full, null, 2)
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function recipeKey(name: string, caliber: string): string {
  return name.trim().toLowerCase() + '|' + caliber.trim().toLowerCase()
}

function loadLogKey(date: Date, recipeName: string | null, quantity: number): string {
  return `${date.getTime()}|${(recipeName ?? '').trim().toLowerCase()}|${quantity}`
}

function rangeLogKey(date: Date, location: string | null, recipeName: string | null): string {
  return `${date.getTime()}|${(location ?? '').trim().toLowerCase()}|${(recipeName ?? '').trim().toLowerCase()}`
}

function linkRecipe(
  recipeName: string | null,
  caliber: string | null,
  existingRecipes: { id: string; name: string; caliber: { name: string } }[],
): string | null {
  if (!recipeName) return null
  const key = recipeKey(recipeName, caliber ?? '')
  const match = existingRecipes.find((r) => recipeKey(r.name, r.caliber.name) === key)
  return match?.id ?? null
}

async function resolvePrimer(
  ref: { brand: string; type: string; magnum: boolean },
  existing: { id: string; brand: string; type: string; magnum: boolean }[],
): Promise<string> {
  const match = existing.find((p) => p.brand === ref.brand && p.type === ref.type)
  if (match) return match.id
  const created = await prisma.primer.create({
    data: { brand: ref.brand, type: ref.type as never, magnum: ref.magnum, amount: 0, description: null },
  })
  return created.id
}

async function resolveProjectile(
  ref: { brand: string; caliber: string; type: string | null; weightGr: number },
  existing: { id: string; brand: string; caliber: string }[],
): Promise<string> {
  const match = existing.find((p) => p.brand === ref.brand && p.caliber === ref.caliber)
  if (match) return match.id
  const created = await prisma.projectile.create({
    data: { brand: ref.brand, caliber: ref.caliber, type: ref.type, weightGr: ref.weightGr, amount: 0, description: null },
  })
  return created.id
}

async function resolvePropellant(
  ref: { brand: string; type: string },
  existing: { id: string; brand: string; type: string }[],
): Promise<string> {
  const match = existing.find((p) => p.brand === ref.brand && p.type === ref.type)
  if (match) return match.id
  const created = await prisma.propellant.create({
    data: { brand: ref.brand, type: ref.type, amountGr: 0, description: null },
  })
  return created.id
}

async function resolveCartridge(
  ref: { brand: string; caliber: string; waterCapacityGr: number | null },
  existing: { id: string; brand: string; caliber: { name: string } }[],
): Promise<string> {
  const match = existing.find((c) => c.brand === ref.brand && c.caliber.name === ref.caliber)
  if (match) return match.id
  const caliberId = await resolveCaliberId(ref.caliber)
  const created = await prisma.cartridge.create({
    data: { brand: ref.brand, caliberId, waterCapacityGr: ref.waterCapacityGr, amount: 0, description: null },
  })
  return created.id
}

function parseExport(jsonString: string, requiredKeys: string[]): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('INVALID_JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
    throw new Error('INVALID_FORMAT')
  }

  const data = parsed as Record<string, unknown>
  const result: Record<string, unknown> = {
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
  }

  let total = 0
  for (const key of requiredKeys) {
    const value = (data as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      result[key] = value
      total += value.length
    } else {
      result[key] = []
    }
  }

  if (total === 0) {
    throw new Error('NO_DATA')
  }

  return result
}

function countMatchExisting<T, E extends { id: string }>(
  items: T[],
  existing: E[],
  keyFn: (item: T) => string,
  existingKeyFn: (item: E) => string,
): { created: number; updated: number } {
  const existingKeys = new Set(existing.map(existingKeyFn))
  let created = 0, updated = 0
  for (const item of items) {
    if (existingKeys.has(keyFn(item))) updated++
    else created++
  }
  return { created, updated }
}