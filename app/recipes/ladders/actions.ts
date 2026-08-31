'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveCaliberId } from '@/lib/resolveCaliber'
import { generateCharges } from '@/lib/ladder'
import { createLadderSchema, createLadderUpdateSchema, createLadderPromoteSchema, formatZodError } from '@/lib/schemas'
import type { DeleteResult } from '@/lib/types'

function revalidateLadderPaths() {
  revalidatePath('/recipes')
  revalidatePath('/')
}

/**
 * Creates a ladder and its N member recipes in one transaction.
 *
 * Members share every component (projectile, propellant, primer, cartridge,
 * rifle, COAL, notes) and differ only in chargeGr; names are the editable
 * prefix + " — {charge}gr". No inventory adjustments happen here — members
 * are ordinary recipes and load logs handle consumption as usual.
 */
export async function createLadder(formData: FormData) {
  const t = await getTranslations('ladders')
  const parsed = createLadderSchema(t).safeParse({
    name: formData.get('name'),
    caliber: formData.get('caliber'),
    projectileId: formData.get('projectileId'),
    propellantId: formData.get('propellantId'),
    primerId: formData.get('primerId') || null,
    cartridgeId: formData.get('cartridgeId') || null,
    rifleId: formData.get('rifleId') || null,
    coal: formData.get('coal') ?? undefined,
    startChargeGr: formData.get('startChargeGr'),
    stepGr: formData.get('stepGr'),
    count: formData.get('count'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }
  const data = parsed.data

  const charges = generateCharges(data.startChargeGr, data.stepGr, data.count)

  const caliberId = await resolveCaliberId(data.caliber, t('errors.caliberRequired'))

  const ladder = await prisma.$transaction(async (tx) => {
    const created = await tx.ladder.create({
      data: { name: data.name, notes: data.notes },
    })
    await tx.recipe.createMany({
      data: charges.map((c) => ({
        name: `${data.name} — ${c.label}gr`,
        caliberId,
        projectileId: data.projectileId,
        propellantId: data.propellantId,
        primerId: data.primerId || null,
        cartridgeId: data.cartridgeId || null,
        rifleId: data.rifleId || null,
        chargeGr: c.charge,
        coal: data.coal,
        notes: data.notes,
        ladderId: created.id,
        ladderChargeIndex: c.index,
      })),
    })
    return created
  })

  revalidateLadderPaths()
  return ladder.id
}

export async function updateLadder(id: string, formData: FormData) {
  const t = await getTranslations('ladders')
  const parsed = createLadderUpdateSchema(t).safeParse({
    name: formData.get('name'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }
  await prisma.ladder.update({ where: { id }, data: parsed.data })
  revalidateLadderPaths()
  revalidatePath(`/recipes/ladders/${id}`)
}

/**
 * Marks a member recipe as the ladder winner. Validates that the recipe is
 * actually a member; a deleted/unlinked recipe clears the winner instead of
 * throwing.
 */
export async function setLadderWinner(ladderId: string, recipeId: string | null) {
  if (recipeId === null) {
    await prisma.ladder.update({ where: { id: ladderId }, data: { winningRecipeId: null } })
    revalidateLadderPaths()
    revalidatePath(`/recipes/ladders/${ladderId}`)
    return
  }
  const member = await prisma.recipe.findFirst({
    where: { id: recipeId, ladderId },
    select: { id: true },
  })
  if (!member) {
    const t = await getTranslations('ladders')
    throw new Error(t('errors.notAMember'))
  }
  await prisma.ladder.update({ where: { id: ladderId }, data: { winningRecipeId: recipeId } })
  revalidateLadderPaths()
  revalidatePath(`/recipes/ladders/${ladderId}`)
}

/**
 * Promotes the marked winner out of the ladder: unlinks it (nulls ladderId
 * + ladderChargeIndex) and renames it. Load logs and range sessions stay on
 * the promoted recipe. If deleteRemaining, the other member recipes are
 * deleted (log FKs SetNull, snapshots survive) and the empty ladder is
 * removed; otherwise other steps stay and winningRecipeId is cleared.
 */
export async function promoteLadderWinner(ladderId: string, formData: FormData) {
  const t = await getTranslations('ladders')
  const parsed = createLadderPromoteSchema(t).safeParse({
    name: formData.get('name'),
    deleteRemaining: formData.get('deleteRemaining'),
  })
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const ladder = await prisma.ladder.findUnique({ where: { id: ladderId } })
  if (!ladder?.winningRecipeId) {
    throw new Error(t('errors.noWinner'))
  }

  const winner = await prisma.recipe.findFirst({
    where: { id: ladder.winningRecipeId, ladderId },
    select: { id: true },
  })
  if (!winner) {
    throw new Error(t('errors.notAMember'))
  }

  const { name, deleteRemaining } = parsed.data

  await prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id: winner.id },
      data: { name, ladderId: null, ladderChargeIndex: null },
    })
    if (deleteRemaining) {
      await tx.recipe.deleteMany({ where: { ladderId } })
      await tx.ladder.delete({ where: { id: ladderId } })
    } else {
      await tx.ladder.update({
        where: { id: ladderId },
        data: { winningRecipeId: null },
      })
    }
  })

  revalidateLadderPaths()
  revalidatePath(`/recipes/ladders/${ladderId}`)
  revalidatePath(`/recipes/${winner.id}`)
  return winner.id
}

/**
 * Deletes a ladder. Member recipes survive: both ladderId and
 * ladderChargeIndex are nulled explicitly (SetNull only clears the FK).
 */
export async function deleteLadder(id: string): Promise<DeleteResult> {
  await prisma.$transaction(async (tx) => {
    await tx.recipe.updateMany({
      where: { ladderId: id },
      data: { ladderId: null, ladderChargeIndex: null },
    })
    await tx.ladder.delete({ where: { id } })
  })
  revalidateLadderPaths()
  return { ok: true }
}

export async function getLadders() {
  return prisma.ladder.findMany({
    include: { recipes: { select: { id: true, ladderChargeIndex: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// The exact row shape returned by getLadder: a ladder plus its member recipes
// with projectile/propellant labels and their range sessions' velocity + group
// data, ordered by ladderChargeIndex (nulls last).
export type LadderWithMembers = Prisma.LadderGetPayload<{
  include: {
    recipes: {
      include: {
        projectile: { select: { brand: true; type: true; weightGr: true } }
        propellant: { select: { brand: true; type: true } }
        rangeLogs: {
          select: {
            velocityMin: true
            velocityMax: true
            velocityAvg: true
            stdDev: true
            groups: { select: { moa: true } }
          }
        }
      }
    }
  }
}>

export async function getLadder(id: string): Promise<LadderWithMembers | null> {
  const ladder = await prisma.ladder.findUnique({
    where: { id },
    include: {
      recipes: {
        include: {
          projectile: { select: { brand: true, type: true, weightGr: true } },
          propellant: { select: { brand: true, type: true } },
          rangeLogs: {
            select: {
              velocityMin: true,
              velocityMax: true,
              velocityAvg: true,
              stdDev: true,
              groups: { select: { moa: true } },
            },
          },
        },
        orderBy: { ladderChargeIndex: 'asc' },
      },
    },
  })
  if (!ladder) return null
  // Postgres sorts nulls first by default; push unindexed members to the end.
  const withNullsLast = [...ladder.recipes].sort((a, b) => {
    if (a.ladderChargeIndex === null && b.ladderChargeIndex === null) return 0
    if (a.ladderChargeIndex === null) return 1
    if (b.ladderChargeIndex === null) return -1
    return a.ladderChargeIndex - b.ladderChargeIndex
  })
  return { ...ladder, recipes: withNullsLast }
}