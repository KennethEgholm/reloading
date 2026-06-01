'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

const GRAIN_TO_GRAM = 0.06479891

export async function createLoadLog(formData: FormData) {
  const recipeId = formData.get('recipeId') as string
  const quantityStr = formData.get('quantity') as string
  const dateStr = formData.get('date') as string
  const notes = (formData.get('notes') as string) || null

  const quantity = parseInt(quantityStr, 10)

  if (!recipeId || isNaN(quantity) || quantity <= 0) {
    throw new Error('Recipe and a positive quantity are required')
  }

  // Fetch the recipe with its components
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      projectile: true,
      propellant: true,
      primer: true,
    },
  })

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  if (!recipe.chargeGr) {
    throw new Error('This recipe has no charge weight defined. Cannot calculate propellant usage.')
  }

  const propellantConsumptionGr = quantity * recipe.chargeGr * GRAIN_TO_GRAM

  // Check stock levels
  const errors: string[] = []

  if (recipe.projectile.amount < quantity) {
    errors.push(`Not enough ${recipe.projectile.brand} ${recipe.projectile.type || ''} projectiles (need ${quantity}, have ${recipe.projectile.amount})`)
  }

  if (recipe.primer && recipe.primer.amount < quantity) {
    errors.push(`Not enough ${recipe.primer.brand} primers (need ${quantity}, have ${recipe.primer.amount})`)
  }

  if (recipe.propellant.amountGr < propellantConsumptionGr) {
    const needed = propellantConsumptionGr.toFixed(1)
    const have = recipe.propellant.amountGr.toFixed(1)
    errors.push(`Not enough ${recipe.propellant.brand} ${recipe.propellant.type} (need ~${needed}g, have ${have}g)`)
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
        caliber: recipe.caliber,
        chargeGr: recipe.chargeGr,

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
      caliber: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function deleteLoadLog(id: string) {
  const log = await prisma.loadLog.findUnique({ where: { id } })

  if (!log) {
    throw new Error('Load log not found')
  }

  const GRAIN_TO_GRAM = 0.06479891
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
