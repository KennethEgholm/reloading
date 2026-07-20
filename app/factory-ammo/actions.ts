'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { createFactoryAmmoSchema, formatZodError } from '@/lib/schemas'
import { resolveCaliberId } from '@/lib/resolveCaliber'
import { getImageMimeType } from '@/lib/imageType'
import type { DeleteResult } from '@/lib/types'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/factory-ammo')
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.avif'])

function safeImageFilename(originalName: string): string {
  const ext = path.extname(path.basename(originalName || '')).toLowerCase()
  const safeExt = ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : '.jpg'
  return `${randomUUID()}${safeExt}`
}

function resolveUploadPath(filename: string): string | null {
  const resolved = path.resolve(UPLOAD_DIR, filename)
  const base = path.resolve(UPLOAD_DIR)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null
  return resolved
}

async function prepareImageUpload(file: File, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (!file || file.size === 0) {
    throw new Error(t('toast.photoInvalid', { name: file?.name || '' }))
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(t('toast.photoTooLarge', { name: file.name }))
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = getImageMimeType(buffer)
  if (!detected) {
    throw new Error(t('toast.photoInvalid', { name: file.name }))
  }
  const filename = safeImageFilename(file.name)
  return { buffer, filename }
}

async function cleanupUploadFiles(filenames: string[]) {
  for (const filename of filenames) {
    const filepath = resolveUploadPath(filename)
    if (filepath) {
      try {
        await unlink(filepath)
      } catch {
        // File might not exist; ignore
      }
    }
  }
}

export async function getFactoryAmmoList() {
  return prisma.factoryAmmo.findMany({
    include: {
      caliber: true,
      sessions: {
        select: {
          id: true,
          date: true,
          velocityAvg: true,
          extremeSpread: true,
          stdDev: true,
          roundsFired: true,
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getFactoryAmmoById(id: string) {
  return prisma.factoryAmmo.findUnique({
    where: { id },
    include: {
      caliber: true,
      sessions: {
        include: {
          _count: { select: { shots: true, groups: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
  })
}

export async function getCalibersForFactoryAmmo() {
  return prisma.caliber.findMany({ orderBy: { name: 'asc' } })
}

export async function createFactoryAmmo(formData: FormData) {
  const t = await getTranslations('factoryAmmo')
  const validated = createFactoryAmmoSchema(t).safeParse({
    brand: formData.get('brand'),
    model: formData.get('model'),
    caliber: formData.get('caliber'),
    amount: formData.get('amount'),
    projectileWeight: formData.get('projectileWeight'),
    projectileWeightUnit: formData.get('projectileWeightUnit'),
    notes: formData.get('notes'),
  })

  if (!validated.success) {
    throw new Error(formatZodError(validated.error))
  }

  const { brand, model, caliber, amount, projectileWeight, projectileWeightUnit, notes } = validated.data
  const caliberId = await resolveCaliberId(caliber, t('form.validation.caliberRequired'))

  const boxFile = formData.get('boxImage') as File | null
  const roundFile = formData.get('roundImage') as File | null

  const pending: { buffer: Buffer; filename: string; slot: 'box' | 'round' }[] = []
  if (boxFile && boxFile.size > 0) {
    pending.push({ ...(await prepareImageUpload(boxFile, t)), slot: 'box' })
  }
  if (roundFile && roundFile.size > 0) {
    pending.push({ ...(await prepareImageUpload(roundFile, t)), slot: 'round' })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  for (const upload of pending) {
    const filepath = path.join(UPLOAD_DIR, upload.filename)
    await writeFile(filepath, upload.buffer)
  }

  let createdId: string | undefined
  try {
    const created = await prisma.factoryAmmo.create({
      data: {
        brand,
        model,
        caliberId,
        amount,
        projectileWeight,
        projectileWeightUnit,
        notes,
        boxImageFilename: pending.find((p) => p.slot === 'box')?.filename ?? null,
        roundImageFilename: pending.find((p) => p.slot === 'round')?.filename ?? null,
      },
    })
    createdId = created.id
  } catch (error) {
    await cleanupUploadFiles(pending.map((p) => p.filename))
    throw error
  }

  revalidatePath('/factory-ammo')
  revalidatePath('/')
  return createdId
}

export async function updateFactoryAmmo(id: string, formData: FormData) {
  const t = await getTranslations('factoryAmmo')
  const validated = createFactoryAmmoSchema(t).safeParse({
    brand: formData.get('brand'),
    model: formData.get('model'),
    caliber: formData.get('caliber'),
    amount: formData.get('amount'),
    projectileWeight: formData.get('projectileWeight'),
    projectileWeightUnit: formData.get('projectileWeightUnit'),
    notes: formData.get('notes'),
  })

  if (!validated.success) {
    throw new Error(formatZodError(validated.error))
  }

  const { brand, model, caliber, amount, projectileWeight, projectileWeightUnit, notes } = validated.data
  const caliberId = await resolveCaliberId(caliber, t('form.validation.caliberRequired'))

  const existing = await prisma.factoryAmmo.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(t('errors.notFound'))
  }

  const boxFile = formData.get('boxImage') as File | null
  const roundFile = formData.get('roundImage') as File | null
  const removeBox = formData.get('removeBoxImage') === 'true'
  const removeRound = formData.get('removeRoundImage') === 'true'

  const pending: { buffer: Buffer; filename: string; slot: 'box' | 'round' }[] = []
  if (boxFile && boxFile.size > 0) {
    pending.push({ ...(await prepareImageUpload(boxFile, t)), slot: 'box' })
  }
  if (roundFile && roundFile.size > 0) {
    pending.push({ ...(await prepareImageUpload(roundFile, t)), slot: 'round' })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  for (const upload of pending) {
    const filepath = path.join(UPLOAD_DIR, upload.filename)
    await writeFile(filepath, upload.buffer)
  }

  const deletedFilenames: string[] = []
  if (removeBox && existing.boxImageFilename && !pending.some((p) => p.slot === 'box')) {
    deletedFilenames.push(existing.boxImageFilename)
  }
  if (removeRound && existing.roundImageFilename && !pending.some((p) => p.slot === 'round')) {
    deletedFilenames.push(existing.roundImageFilename)
  }
  // Replacing a photo also deletes the old file on disk.
  if (pending.some((p) => p.slot === 'box') && existing.boxImageFilename) {
    deletedFilenames.push(existing.boxImageFilename)
  }
  if (pending.some((p) => p.slot === 'round') && existing.roundImageFilename) {
    deletedFilenames.push(existing.roundImageFilename)
  }

  try {
    await prisma.factoryAmmo.update({
      where: { id },
      data: {
        brand,
        model,
        caliberId,
        amount,
        projectileWeight,
        projectileWeightUnit,
        notes,
        boxImageFilename: pending.find((p) => p.slot === 'box')?.filename
          ?? (removeBox ? null : existing.boxImageFilename),
        roundImageFilename: pending.find((p) => p.slot === 'round')?.filename
          ?? (removeRound ? null : existing.roundImageFilename),
      },
    })
    await cleanupUploadFiles(deletedFilenames)
  } catch (error) {
    await cleanupUploadFiles(pending.map((p) => p.filename))
    throw error
  }

  revalidatePath('/factory-ammo')
  revalidatePath(`/factory-ammo/${id}`)
  revalidatePath('/')
}

export async function deleteFactoryAmmo(id: string): Promise<DeleteResult> {
  const t = await getTranslations('factoryAmmo')
  const ammo = await prisma.factoryAmmo.findUnique({ where: { id } })
  if (!ammo) {
    return { ok: false, error: t('errors.notFound') }
  }

  const filenames = [ammo.boxImageFilename, ammo.roundImageFilename].filter((f): f is string => !!f)
  await cleanupUploadFiles(filenames)

  // Cascade removes sessions/shots/groups.
  await prisma.factoryAmmo.delete({ where: { id } })

  revalidatePath('/factory-ammo')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteFactoryAmmoAndRedirect(id: string): Promise<void> {
  const result = await deleteFactoryAmmo(id)
  if (!result.ok) {
    throw new Error(result.error)
  }
  redirect('/factory-ammo')
}