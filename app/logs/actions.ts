'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { createLoadLogSchema, formatZodError } from '@/lib/schemas'
import { GRAIN_TO_GRAM } from '@/lib/inventory'

export async function createLoadLog(formData: FormData) {
  const t = await getTranslations('logs')
  const parsed = createLoadLogSchema(t).safeParse({
    recipeId: formData.get('recipeId'),
    quantity: formData.get('quantity'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  })

  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const { recipeId, quantity, date: dateStr, notes } = parsed.data

  // Fetch the recipe with its components
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      caliber: true,
      projectile: true,
      propellant: true,
      primer: true,
      cartridge: { include: { caliber: true } },
    },
  })

  if (!recipe) {
    throw new Error(t('errors.recipeNotFound'))
  }

  if (!recipe.chargeGr) {
    throw new Error(t('errors.noCharge'))
  }

  const propellantConsumptionGr = quantity * recipe.chargeGr * GRAIN_TO_GRAM

  // Check stock levels
  const errors: string[] = []

  if (recipe.projectile.amount < quantity) {
    errors.push(t('errors.insufficientProjectiles', {
      brand: recipe.projectile.brand,
      type: recipe.projectile.type || '',
      need: quantity,
      have: recipe.projectile.amount,
    }))
  }

  if (recipe.primer && recipe.primer.amount < quantity) {
    errors.push(t('errors.insufficientPrimers', {
      brand: recipe.primer.brand,
      need: quantity,
      have: recipe.primer.amount,
    }))
  }

  if (recipe.propellant.amountGr < propellantConsumptionGr) {
    const needed = propellantConsumptionGr.toFixed(1)
    const have = recipe.propellant.amountGr.toFixed(1)
    errors.push(t('errors.insufficientPropellant', {
      brand: recipe.propellant.brand,
      type: recipe.propellant.type,
      need: needed,
      have: have,
    }))
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  const loadDate = dateStr ? new Date(dateStr) : new Date()

  // Perform the log creation + inventory deduction in a transaction
  await prisma.$transaction(async (tx) => {
    // Create the load log with full snapshot data for historical accuracy
    await tx.loadLog.create({
      data: {
        date: loadDate,
        recipeId,
        quantity,
        notes,

        // Recipe snapshot
        recipeName: recipe.name,
        caliber: recipe.caliber.name,
        chargeGr: recipe.chargeGr,
        coal: recipe.coal,

        // Projectile snapshot
        projectileBrand: recipe.projectile.brand,
        projectileType: recipe.projectile.type,
        projectileWeightGr: recipe.projectile.weightGr,

        // Propellant snapshot
        propellantBrand: recipe.propellant.brand,
        propellantType: recipe.propellant.type,

        // Primer snapshot (if used)
        primerBrand: recipe.primer?.brand ?? null,
        primerType: recipe.primer?.type ?? null,

        // Cartridge snapshot (if the recipe links one)
        cartridgeBrand: recipe.cartridge?.brand ?? null,
        cartridgeCaliber: recipe.cartridge?.caliber?.name ?? null,
        cartridgeWaterCapacityGr: recipe.cartridge?.waterCapacityGr ?? null,

        // Optional recipe data at time of load
        calculatedV0: recipe.calculatedV0,
        measuredV0: recipe.measuredV0,
        fillRate: recipe.fillRate,

        // Component IDs for future restoration (e.g. on delete)
        projectileId: recipe.projectileId,
        propellantId: recipe.propellantId,
        primerId: recipe.primerId,
      },
    })

    // Deduct projectile stock
    await tx.projectile.update({
      where: { id: recipe.projectileId },
      data: {
        amount: { decrement: quantity },
      },
    })

    // Deduct primer stock (if used)
    if (recipe.primerId) {
      await tx.primer.update({
        where: { id: recipe.primerId },
        data: {
          amount: { decrement: quantity },
        },
      })
    }

    // Deduct propellant stock
    await tx.propellant.update({
      where: { id: recipe.propellantId },
      data: {
        amountGr: { decrement: propellantConsumptionGr },
      },
    })
  })

  revalidatePath('/recipes')
  revalidatePath('/logs')
  revalidatePath('/')
}

export async function getLoadLogs() {
  return prisma.loadLog.findMany({
    orderBy: { date: 'desc' },
  })
}

export async function getRecipesForLog() {
  return prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      caliber: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function deleteLoadLog(id: string) {
  const t = await getTranslations('logs')
  const log = await prisma.loadLog.findUnique({ where: { id } })

  if (!log) {
    throw new Error(t('errors.notFound'))
  }

  const propellantRestorationGr = log.chargeGr
    ? log.quantity * log.chargeGr * GRAIN_TO_GRAM
    : 0

  await prisma.$transaction(async (tx) => {
    // Restore projectile stock
    if (log.projectileId) {
      await tx.projectile.update({
        where: { id: log.projectileId },
        data: { amount: { increment: log.quantity } },
      })
    }

    // Restore primer stock (if it was used)
    if (log.primerId) {
      await tx.primer.update({
        where: { id: log.primerId },
        data: { amount: { increment: log.quantity } },
      })
    }

    // Restore propellant stock
    if (log.propellantId && propellantRestorationGr > 0) {
      await tx.propellant.update({
        where: { id: log.propellantId },
        data: { amountGr: { increment: propellantRestorationGr } },
      })
    }

    // Delete the log entry
    await tx.loadLog.delete({ where: { id } })
  })

  revalidatePath('/logs')
  revalidatePath('/recipes')
  revalidatePath('/')
}

export async function getLoadLogById(id: string) {
  return prisma.loadLog.findUnique({
    where: { id },
  })
}
