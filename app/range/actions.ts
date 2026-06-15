'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { rangeLogInputSchema, rangeLogUpdateInputSchema } from '@/lib/schemas'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/range-logs')
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.avif'])

/**
 * Builds a safe, server-controlled upload filename. The client-supplied
 * file.name is NEVER used as a path component (it could contain "../" or other
 * traversal sequences); we only derive the extension from it, validated against
 * an allow-list. The base name is a random UUID, guaranteeing uniqueness and
 * that the result stays inside UPLOAD_DIR.
 */
function safeImageFilename(originalName: string): string {
  // path.extname on the basename only, so a crafted name can not smuggle a path.
  const ext = path.extname(path.basename(originalName || '')).toLowerCase()
  const safeExt = ALLOWED_IMAGE_EXTENSIONS.has(ext) ? ext : '.jpg'
  return `${randomUUID()}${safeExt}`
}

/**
 * Resolves a stored filename to an absolute path inside UPLOAD_DIR, or null if
 * it would escape that directory. New uploads use safeImageFilename, but legacy
 * DB rows predating that fix could contain traversal sequences — so any unlink
 * driven by a stored filename is guarded through here.
 */
function resolveUploadPath(filename: string): string | null {
  const resolved = path.resolve(UPLOAD_DIR, filename)
  const base = path.resolve(UPLOAD_DIR)
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null
  return resolved
}

type PendingUpload = {
  buffer: Buffer
  filename: string
  description: string | null
}

/**
 * Detects the MIME type of an image by inspecting its magic bytes.
 * Returns null if the buffer is not a recognized image format.
 */
function getImageMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp'
  }
  // ISO Base Media File Format (AVIF, HEIC)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.slice(8, 12).toString('ascii')
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'hevc') return 'image/heic'
  }
  return null
}

/**
 * Validates an uploaded image and returns a pending upload descriptor.
 * Throws if the file is empty, too large, or not a recognized image.
 */
async function prepareImageUpload(file: File, description: string | null): Promise<PendingUpload> {
  if (!file || file.size === 0) {
    throw new Error('Uploaded file is empty')
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Photo "${file.name}" exceeds the 10 MB size limit.`)
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = getImageMimeType(buffer)
  if (!detected) {
    throw new Error(`File "${file.name}" is not a recognized image.`)
  }
  const filename = safeImageFilename(file.name)
  return { buffer, filename, description }
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

export async function getRangeLogs() {
  return prisma.rangeLog.findMany({
    include: {
      recipe: {
        select: { id: true, name: true, caliber: true },
      },
      mainImage: {
        select: { id: true, filename: true, description: true },
      },
      _count: {
        select: { images: true },
      },
    },
    orderBy: { date: 'desc' },
  })
}

export async function getRangeLogById(id: string) {
  return prisma.rangeLog.findUnique({
    where: { id },
    include: {
      recipe: {
        select: { id: true, name: true, caliber: true },
      },
      mainImage: {
        select: { id: true, filename: true, description: true },
      },
      images: true,
    },
  })
}

export async function getRecipesForRangeLog() {
  return prisma.recipe.findMany({
    select: { id: true, name: true, caliber: true },
    orderBy: { name: 'asc' },
  })
}

export async function createRangeLog(formData: FormData) {
  const validated = rangeLogInputSchema.safeParse({
    date: formData.get('date'),
    location: formData.get('location'),
    conditions: formData.get('conditions'),
    recipeId: formData.get('recipeId'),
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
    recipeId,
    roundsFired,
    velocityMin,
    velocityMax,
    velocityAvg,
    extremeSpread,
    stdDev,
    notes,
  } = validated.data

  const date = new Date(dateStr)

  const imageFiles = formData.getAll('newImages') as File[]
  const descriptions = formData.getAll('newImageDescriptions') as string[]

  const pendingUploads: PendingUpload[] = []
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    if (!file || file.size === 0) continue
    pendingUploads.push(await prepareImageUpload(file, descriptions[i] || null))
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  for (const upload of pendingUploads) {
    const filepath = path.join(UPLOAD_DIR, upload.filename)
    await writeFile(filepath, upload.buffer)
  }

  let rangeLogId: string | undefined
  try {
    await prisma.$transaction(async (tx) => {
      const rangeLog = await tx.rangeLog.create({
        data: {
          date,
          location,
          conditions,
          recipeId,
          roundsFired,
          velocityMin,
          velocityMax,
          velocityAvg,
          extremeSpread,
          stdDev,
          notes,
        },
      })

      rangeLogId = rangeLog.id

      const createdImages = []
      for (const upload of pendingUploads) {
        const created = await tx.rangeLogImage.create({
          data: {
            rangeLogId: rangeLog.id,
            filename: upload.filename,
            description: upload.description,
          },
        })
        createdImages.push(created)
      }

      if (createdImages[0]) {
        await tx.rangeLog.update({
          where: { id: rangeLog.id },
          data: { mainImageId: createdImages[0].id },
        })
      }
    })
  } catch (error) {
    await cleanupUploadFiles(pendingUploads.map((u) => u.filename))
    throw error
  }

  if (rangeLogId) {
    revalidatePath('/range')
    revalidatePath(`/range/${rangeLogId}`)
    revalidatePath('/')
  }
}

export async function deleteRangeLogImage(imageId: string) {
  const image = await prisma.rangeLogImage.findUnique({
    where: { id: imageId },
    include: { rangeLog: true },
  })

  if (!image) {
    throw new Error('Image not found')
  }

  // Delete the file from disk (best effort)
  const filepath = resolveUploadPath(image.filename)
  if (filepath) {
    try {
      await unlink(filepath)
    } catch {
      // File might not exist, ignore
    }
  }

  await prisma.rangeLogImage.delete({ where: { id: imageId } })

  // If this was the main image for the log, clear the pointer
  await prisma.rangeLog.updateMany({
    where: { mainImageId: imageId },
    data: { mainImageId: null },
  })

  revalidatePath(`/range/${image.rangeLogId}`)
  revalidatePath('/range')
  revalidatePath('/')
}

export async function updateRangeLog(id: string, formData: FormData) {
  const validated = rangeLogUpdateInputSchema.safeParse({
    date: formData.get('date'),
    location: formData.get('location'),
    conditions: formData.get('conditions'),
    recipeId: formData.get('recipeId'),
    roundsFired: formData.get('roundsFired'),
    velocityMin: formData.get('velocityMin'),
    velocityMax: formData.get('velocityMax'),
    velocityAvg: formData.get('velocityAvg'),
    extremeSpread: formData.get('extremeSpread'),
    stdDev: formData.get('stdDev'),
    notes: formData.get('notes'),
    mainImageId: formData.get('mainImageId'),
  })

  if (!validated.success) {
    throw new Error(validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n'))
  }

  const {
    date: dateStr,
    location,
    conditions,
    recipeId,
    roundsFired,
    velocityMin,
    velocityMax,
    velocityAvg,
    extremeSpread,
    stdDev,
    notes,
    mainImageId,
  } = validated.data

  const date = new Date(dateStr)

  const newImageFiles = formData.getAll('newImages') as File[]
  const newDescriptions = formData.getAll('newImageDescriptions') as string[]

  const pendingUploads: PendingUpload[] = []
  for (let i = 0; i < newImageFiles.length; i++) {
    const file = newImageFiles[i]
    if (!file || file.size === 0) continue
    pendingUploads.push(await prepareImageUpload(file, newDescriptions[i] || null))
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  for (const upload of pendingUploads) {
    const filepath = path.join(UPLOAD_DIR, upload.filename)
    await writeFile(filepath, upload.buffer)
  }

  const existingImageIds = formData.getAll('existingImageId') as string[]
  const existingDescriptions = formData.getAll('existingImageDescription') as string[]
  const deleteImageIds = formData.getAll('deleteImageId') as string[]

  const deletedImageFilenames: string[] = []

  try {
    await prisma.$transaction(async (tx) => {
      // Update main fields
      await tx.rangeLog.update({
        where: { id },
        data: {
          date,
          location,
          conditions,
          roundsFired,
          velocityMin,
          velocityMax,
          velocityAvg,
          extremeSpread,
          stdDev,
          notes,
          ...(recipeId ? { recipeId } : {}),
          mainImageId: mainImageId || null,
        },
      })

      // Handle existing image description updates and deletions
      for (let i = 0; i < existingImageIds.length; i++) {
        const imgId = existingImageIds[i]
        if (deleteImageIds.includes(imgId)) {
          const img = await tx.rangeLogImage.findUnique({ where: { id: imgId } })
          if (img) {
            deletedImageFilenames.push(img.filename)
            await tx.rangeLogImage.delete({ where: { id: imgId } })
          }
        } else {
          await tx.rangeLogImage.update({
            where: { id: imgId },
            data: { description: existingDescriptions[i] || null },
          })
        }
      }

      // Create new images
      const createdIds: string[] = []
      for (const upload of pendingUploads) {
        const created = await tx.rangeLogImage.create({
          data: {
            rangeLogId: id,
            filename: upload.filename,
            description: upload.description,
          },
        })
        createdIds.push(created.id)
      }

      // If no main was sent from existing (e.g. this log had none before), auto-set first new as main
      if (!mainImageId && createdIds.length > 0) {
        await tx.rangeLog.update({
          where: { id },
          data: { mainImageId: createdIds[0] },
        })
      }
    })

    // Transaction succeeded; delete files for removed images
    await cleanupUploadFiles(deletedImageFilenames)
  } catch (error) {
    // Transaction failed; clean up any new files we wrote
    await cleanupUploadFiles(pendingUploads.map((u) => u.filename))
    throw error
  }

  revalidatePath('/range')
  revalidatePath(`/range/${id}`)
  revalidatePath('/')
}
