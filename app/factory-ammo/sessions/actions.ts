'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import {
  createFactoryAmmoSessionSchema,
  shotsSchema,
  groupsSchema,
} from '@/lib/schemas'
import { computeAggregates } from '@/lib/parseChronographCsv'
import { computeMoa } from '@/lib/moa'
import type { DeleteResult } from '@/lib/types'

export async function getFactoryAmmoSessionById(ammoId: string, sessionId: string) {
  return prisma.factoryAmmoSession.findUnique({
    where: { id: sessionId },
    include: {
      shots: { orderBy: { shotIndex: 'asc' } },
      groups: { orderBy: { createdAt: 'asc' } },
      factoryAmmo: { select: { id: true, brand: true, model: true, caliber: { select: { name: true } } } },
    },
  })
}

export async function createFactoryAmmoSession(ammoId: string, formData: FormData) {
  const t = await getTranslations('factoryAmmo')
  const validated = createFactoryAmmoSessionSchema(t).safeParse({
    date: formData.get('date'),
    location: formData.get('location'),
    conditions: formData.get('conditions'),
    roundsFired: formData.get('roundsFired'),
    velocityMin: formData.get('velocityMin'),
    velocityMax: formData.get('velocityMax'),
    velocityAvg: formData.get('velocityAvg'),
    extremeSpread: formData.get('extremeSpread'),
    stdDev: formData.get('stdDev'),
    notes: formData.get('notes'),
  })

  if (!validated.success) {
    throw new Error(validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n'))
  }

  const {
    date: dateStr,
    location,
    conditions,
    roundsFired,
    velocityMin,
    velocityMax,
    velocityAvg,
    extremeSpread,
    stdDev,
    notes,
  } = validated.data

  const date = new Date(dateStr)

  const validShots = parseShots(formData, t)
  const validGroups = parseGroups(formData, t)

  const effectiveAggregates = validShots ? computeAggregates(validShots) : null

  // Verify the parent exists (and capture the relation).
  const ammo = await prisma.factoryAmmo.findUnique({ where: { id: ammoId }, select: { id: true } })
  if (!ammo) {
    throw new Error(t('errors.ammoNotFound'))
  }

  let createdId: string | undefined
  await prisma.$transaction(async (tx) => {
    const session = await tx.factoryAmmoSession.create({
      data: {
        factoryAmmoId: ammoId,
        date,
        location,
        conditions,
        roundsFired: effectiveAggregates?.roundsFired ?? roundsFired,
        velocityMin: effectiveAggregates?.velocityMin ?? velocityMin,
        velocityMax: effectiveAggregates?.velocityMax ?? velocityMax,
        velocityAvg: effectiveAggregates?.velocityAvg ?? velocityAvg,
        extremeSpread: effectiveAggregates?.extremeSpread ?? extremeSpread,
        stdDev: effectiveAggregates?.stdDev ?? stdDev,
        notes,
      },
    })
    createdId = session.id

    if (validShots) {
      await tx.factoryAmmoShot.createMany({
        data: validShots.map((s) => ({ ...s, sessionId: session.id })),
      })
    }
    if (validGroups) {
      await tx.factoryAmmoGroup.createMany({
        data: validGroups.map((g) => ({ ...g, sessionId: session.id })),
      })
    }
  })

  if (createdId) {
    revalidatePath(`/factory-ammo/${ammoId}`)
    revalidatePath(`/factory-ammo/${ammoId}/sessions/${createdId}`)
    revalidatePath('/factory-ammo')
    revalidatePath('/')
  }
}

export async function updateFactoryAmmoSession(ammoId: string, sessionId: string, formData: FormData) {
  const t = await getTranslations('factoryAmmo')
  const validated = createFactoryAmmoSessionSchema(t).safeParse({
    date: formData.get('date'),
    location: formData.get('location'),
    conditions: formData.get('conditions'),
    roundsFired: formData.get('roundsFired'),
    velocityMin: formData.get('velocityMin'),
    velocityMax: formData.get('velocityMax'),
    velocityAvg: formData.get('velocityAvg'),
    extremeSpread: formData.get('extremeSpread'),
    stdDev: formData.get('stdDev'),
    notes: formData.get('notes'),
  })

  if (!validated.success) {
    throw new Error(validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n'))
  }

  const {
    date: dateStr,
    location,
    conditions,
    roundsFired,
    velocityMin,
    velocityMax,
    velocityAvg,
    extremeSpread,
    stdDev,
    notes,
  } = validated.data

  const date = new Date(dateStr)

  const replaceShots = formData.get('replaceShots') === 'true'
  const replaceGroups = formData.get('replaceGroups') === 'true'
  const validShots = parseShots(formData, t)
  const validGroups = parseGroups(formData, t)

  const effectiveAggregates = validShots ? computeAggregates(validShots) : null

  await prisma.$transaction(async (tx) => {
    await tx.factoryAmmoSession.update({
      where: { id: sessionId },
      data: {
        date,
        location,
        conditions,
        roundsFired: effectiveAggregates?.roundsFired ?? roundsFired,
        velocityMin: effectiveAggregates?.velocityMin ?? velocityMin,
        velocityMax: effectiveAggregates?.velocityMax ?? velocityMax,
        velocityAvg: effectiveAggregates?.velocityAvg ?? velocityAvg,
        extremeSpread: effectiveAggregates?.extremeSpread ?? extremeSpread,
        stdDev: effectiveAggregates?.stdDev ?? stdDev,
        notes,
      },
    })

    if (replaceShots) {
      await tx.factoryAmmoShot.deleteMany({ where: { sessionId } })
      if (validShots) {
        await tx.factoryAmmoShot.createMany({
          data: validShots.map((s) => ({ ...s, sessionId })),
        })
      }
    }

    if (replaceGroups) {
      await tx.factoryAmmoGroup.deleteMany({ where: { sessionId } })
      if (validGroups) {
        await tx.factoryAmmoGroup.createMany({
          data: validGroups.map((g) => ({ ...g, sessionId })),
        })
      }
    }
  })

  revalidatePath(`/factory-ammo/${ammoId}`)
  revalidatePath(`/factory-ammo/${ammoId}/sessions/${sessionId}`)
  revalidatePath('/factory-ammo')
  revalidatePath('/')
}

export async function deleteFactoryAmmoSession(ammoId: string, sessionId: string): Promise<DeleteResult> {
  const t = await getTranslations('factoryAmmo')
  const session = await prisma.factoryAmmoSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    return { ok: false, error: t('errors.sessionNotFound') }
  }
  // Cascade removes shots + groups.
  await prisma.factoryAmmoSession.delete({ where: { id: sessionId } })

  revalidatePath(`/factory-ammo/${ammoId}`)
  revalidatePath('/factory-ammo')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteFactoryAmmoSessionAndRedirect(ammoId: string, sessionId: string): Promise<void> {
  const result = await deleteFactoryAmmoSession(ammoId, sessionId)
  if (!result.ok) {
    throw new Error(result.error)
  }
  redirect(`/factory-ammo/${ammoId}`)
}

function parseShots(formData: FormData, t: Awaited<ReturnType<typeof getTranslations>>) {
  const raw = formData.get('shots')
  if (!raw || typeof raw !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(t('errors.csvShotsInvalid'))
  }
  const result = shotsSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(t('errors.csvShotsInvalid'))
  }
  return result.data
}

function parseGroups(formData: FormData, t: Awaited<ReturnType<typeof getTranslations>>) {
  const raw = formData.get('groups')
  if (!raw || typeof raw !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(t('errors.groupsInvalid'))
  }
  const result = groupsSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(t('errors.groupsInvalid'))
  }
  return result.data.map((g) => ({
    distanceM: g.distanceM,
    shotCount: g.shotCount,
    groupSizeMm: g.groupSizeMm,
    notes: g.notes,
    moa: computeMoa(g.groupSizeMm, g.distanceM),
  }))
}