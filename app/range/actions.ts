'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/range-logs')
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

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
  const date = new Date(formData.get('date') as string)
  const location = (formData.get('location') as string) || null
  const conditions = (formData.get('conditions') as string) || null
  const recipeId = formData.get('recipeId') as string
  const roundsFired = parseInt(formData.get('roundsFired') as string, 10)

  const velocityMin = formData.get('velocityMin') ? parseFloat(formData.get('velocityMin') as string) : null
  const velocityMax = formData.get('velocityMax') ? parseFloat(formData.get('velocityMax') as string) : null
  const velocityAvg = formData.get('velocityAvg') ? parseFloat(formData.get('velocityAvg') as string) : null
  const extremeSpread = formData.get('extremeSpread') ? parseFloat(formData.get('extremeSpread') as string) : null
  const stdDev = formData.get('stdDev') ? parseFloat(formData.get('stdDev') as string) : null

  const notes = (formData.get('notes') as string) || null

  if (!recipeId || isNaN(roundsFired) || roundsFired <= 0) {
    throw new Error('Recipe and rounds fired are required')
  }

  // Create the RangeLog first
  const rangeLog = await prisma.rangeLog.create({
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

  // Handle image uploads
  const imageFiles = formData.getAll('newImages') as File[]
  const descriptions = formData.getAll('newImageDescriptions') as string[]
  console.log('[createRangeLog] received newImages count:', imageFiles.length, 'names:', imageFiles.map((f: any) => f?.name || '(empty)'))

  await mkdir(UPLOAD_DIR, { recursive: true })

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

  let firstMainImageId: string | null = null

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i]
    if (!file || file.size === 0) continue

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Photo "${file.name}" exceeds the 10 MB size limit.`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${i}-${file.name.replace(/\s+/g, '-')}`
    const filepath = path.join(UPLOAD_DIR, filename)

    await writeFile(filepath, buffer)

    const createdImage = await prisma.rangeLogImage.create({
      data: {
        rangeLogId: rangeLog.id,
        filename,
        description: descriptions[i] || null,
      },
    })

    if (!firstMainImageId) {
      firstMainImageId = createdImage.id
    }
  }

  if (firstMainImageId) {
    await prisma.rangeLog.update({
      where: { id: rangeLog.id },
      data: { mainImageId: firstMainImageId },
    })
  }

  revalidatePath('/range')
  revalidatePath(`/range/${rangeLog.id}`)
  revalidatePath('/')
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
  try {
    const fs = await import('fs/promises')
    const filepath = path.join(UPLOAD_DIR, image.filename)
    await fs.unlink(filepath)
  } catch (e) {
    // File might not exist, ignore
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
  const date = new Date(formData.get('date') as string)
  const location = (formData.get('location') as string) || null
  const conditions = (formData.get('conditions') as string) || null
  const roundsFired = parseInt(formData.get('roundsFired') as string, 10)

  const velocityMin = formData.get('velocityMin') ? parseFloat(formData.get('velocityMin') as string) : null
  const velocityMax = formData.get('velocityMax') ? parseFloat(formData.get('velocityMax') as string) : null
  const velocityAvg = formData.get('velocityAvg') ? parseFloat(formData.get('velocityAvg') as string) : null
  const extremeSpread = formData.get('extremeSpread') ? parseFloat(formData.get('extremeSpread') as string) : null
  const stdDev = formData.get('stdDev') ? parseFloat(formData.get('stdDev') as string) : null

  const notes = (formData.get('notes') as string) || null
  const recipeId = formData.get('recipeId') as string | null
  const mainImageId = (formData.get('mainImageId') as string) || null

  if (isNaN(roundsFired) || roundsFired <= 0) {
    throw new Error('Rounds fired must be a positive number')
  }

  // Update main fields (including main image if provided)
  await prisma.rangeLog.update({
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
  const existingImageIds = formData.getAll('existingImageId') as string[]
  const existingDescriptions = formData.getAll('existingImageDescription') as string[]
  const deleteImageIds = formData.getAll('deleteImageId') as string[]

  for (let i = 0; i < existingImageIds.length; i++) {
    const imgId = existingImageIds[i]
    if (deleteImageIds.includes(imgId)) {
      // Delete the image
      const img = await prisma.rangeLogImage.findUnique({ where: { id: imgId } })
      if (img) {
        try {
          const fs = await import('fs/promises')
          await fs.unlink(path.join(UPLOAD_DIR, img.filename))
        } catch {}
        await prisma.rangeLogImage.delete({ where: { id: imgId } })
      }
    } else {
      // Update description
      await prisma.rangeLogImage.update({
        where: { id: imgId },
        data: { description: existingDescriptions[i] || null },
      })
    }
  }

  // Handle new images
  const newImageFiles = formData.getAll('newImages') as File[]
  const newDescriptions = formData.getAll('newImageDescriptions') as string[]
  console.log('[updateRangeLog] received newImages count:', newImageFiles.length, 'names:', newImageFiles.map((f: any) => f?.name || '(empty)'))

  const createdNewImageIds: string[] = []

  for (let i = 0; i < newImageFiles.length; i++) {
    const file = newImageFiles[i]
    if (!file || file.size === 0) continue

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Photo "${file.name}" exceeds the 10 MB size limit.`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${i}-${file.name.replace(/\s+/g, '-')}`
    const filepath = path.join(UPLOAD_DIR, filename)

    await writeFile(filepath, buffer)

    const created = await prisma.rangeLogImage.create({
      data: {
        rangeLogId: id,
        filename,
        description: newDescriptions[i] || null,
      },
    })
    createdNewImageIds.push(created.id)
  }

  // If no main was sent from existing (e.g. this log had none before), auto-set first new as main
  if (!mainImageId && createdNewImageIds.length > 0) {
    await prisma.rangeLog.update({
      where: { id },
      data: { mainImageId: createdNewImageIds[0] },
    })
  }

  revalidatePath('/range')
  revalidatePath(`/range/${id}`)
  revalidatePath('/')
}
