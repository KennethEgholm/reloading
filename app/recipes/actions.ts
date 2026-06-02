'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createRecipe(formData: FormData) {
  const name = formData.get('name') as string
  const caliber = formData.get('caliber') as string
  const projectileId = formData.get('projectileId') as string
  const propellantId = formData.get('propellantId') as string
  const primerId = (formData.get('primerId') as string) || null
  const chargeGr = formData.get('chargeGr') ? parseFloat(formData.get('chargeGr') as string) : null
  const coal = formData.get('coal') ? parseFloat(formData.get('coal') as string) : null
  const calculatedV0 = formData.get('calculatedV0') ? parseFloat(formData.get('calculatedV0') as string) : null
  const measuredV0 = formData.get('measuredV0') ? parseFloat(formData.get('measuredV0') as string) : null
  const fillRate = formData.get('fillRate') ? parseFloat(formData.get('fillRate') as string) : null
  const notes = (formData.get('notes') as string) || null

  if (!name || !caliber || !projectileId || !propellantId) {
    throw new Error('Name, caliber, projectile, and propellant are required')
  }

  await prisma.recipe.create({
    data: {
      name,
      caliber,
      projectileId,
      propellantId,
      primerId,
      chargeGr,
      coal,
      calculatedV0,
      measuredV0,
      fillRate,
      notes,
    },
  })

  revalidatePath('/recipes')
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } })
  revalidatePath('/recipes')
}

export async function updateRecipe(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const caliber = formData.get('caliber') as string
  const projectileId = formData.get('projectileId') as string
  const propellantId = formData.get('propellantId') as string
  const primerId = (formData.get('primerId') as string) || null
  const chargeGr = formData.get('chargeGr') ? parseFloat(formData.get('chargeGr') as string) : null
  const coal = formData.get('coal') ? parseFloat(formData.get('coal') as string) : null
  const calculatedV0 = formData.get('calculatedV0') ? parseFloat(formData.get('calculatedV0') as string) : null
  const measuredV0 = formData.get('measuredV0') ? parseFloat(formData.get('measuredV0') as string) : null
  const fillRate = formData.get('fillRate') ? parseFloat(formData.get('fillRate') as string) : null
  const notes = (formData.get('notes') as string) || null

  if (!name || !caliber || !projectileId || !propellantId) {
    throw new Error('Name, caliber, projectile, and propellant are required')
  }

  await prisma.recipe.update({
    where: { id },
    data: {
      name,
      caliber,
      projectileId,
      propellantId,
      primerId,
      chargeGr,
      coal,
      calculatedV0,
      measuredV0,
      fillRate,
      notes,
    },
  })

  revalidatePath('/recipes')
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      projectile: true,
      propellant: true,
      primer: true,
      loadLogs: {
        orderBy: { date: 'desc' },
        take: 5,
      },
      rangeLogs: {
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          images: {
            take: 1,
          },
        },
      },
    },
  })
}
