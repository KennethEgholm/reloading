'use server'

import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { revalidatePath } from 'next/cache'

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
    prisma.cartridge.findMany({ orderBy: { createdAt: 'asc' } }),
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
      caliber: c.caliber,
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
  const data = parseExport(jsonString)

  const [existingPrimers, existingProjectiles, existingPropellants, existingCartridges] = await Promise.all([
    prisma.primer.findMany(),
    prisma.projectile.findMany(),
    prisma.propellant.findMany(),
    prisma.cartridge.findMany(),
  ])

  return {
    primers: countMatchExisting(data.primers, existingPrimers, (i) => i.brand + '|' + i.type, (e) => e.brand + '|' + e.type),
    projectiles: countMatchExisting(data.projectiles, existingProjectiles, (i) => i.brand + '|' + i.caliber, (e) => e.brand + '|' + e.caliber),
    propellants: countMatchExisting(data.propellants, existingPropellants, (i) => i.brand + '|' + i.type, (e) => e.brand + '|' + e.type),
    cartridges: countMatchExisting(data.cartridges, existingCartridges, (i) => i.brand + '|' + i.caliber, (e) => e.brand + '|' + e.caliber),
  }
}

export async function executeInventoryImport(jsonString: string): Promise<ImportPreview> {
  const t = await getTranslations('settings')
  const data = parseExport(jsonString)

  const [existingPrimers, existingProjectiles, existingPropellants, existingCartridges] = await Promise.all([
    prisma.primer.findMany(),
    prisma.projectile.findMany(),
    prisma.propellant.findMany(),
    prisma.cartridge.findMany(),
  ])

  const primerMap = new Map(existingPrimers.map((p) => [p.brand + '|' + p.type, p]))
  const projectileMap = new Map(existingProjectiles.map((p) => [p.brand + '|' + p.caliber, p]))
  const propellantMap = new Map(existingPropellants.map((p) => [p.brand + '|' + p.type, p]))
  const cartridgeMap = new Map(existingCartridges.map((c) => [c.brand + '|' + c.caliber, c]))

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
      await prisma.cartridge.create({ data: { brand: item.brand, caliber: item.caliber, waterCapacityGr: item.waterCapacityGr, amount: item.amount, description: item.description } })
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

function parseExport(jsonString: string): InventoryExport {
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
  const result: InventoryExport = {
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    primers: Array.isArray(data.primers) ? data.primers as InventoryExport['primers'] : [],
    projectiles: Array.isArray(data.projectiles) ? data.projectiles as InventoryExport['projectiles'] : [],
    propellants: Array.isArray(data.propellants) ? data.propellants as InventoryExport['propellants'] : [],
    cartridges: Array.isArray(data.cartridges) ? data.cartridges as InventoryExport['cartridges'] : [],
  }

  const total = result.primers.length + result.projectiles.length + result.propellants.length + result.cartridges.length
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