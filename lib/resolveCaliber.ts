import { prisma } from '@/lib/prisma'

/**
 * Resolves a free-text caliber designation to a Caliber row id, creating the
 * row if no case-insensitive match exists. Centralizes the "find or create"
 * used by recipe / cartridge / import server actions so that ".308 win" and
 * ".308 Win" always collapse onto a single canonical Caliber.
 *
 * The name is trimmed; the first spelling to be created wins as canonical.
 * Throws when the name is empty/whitespace (callers pass a localized message).
 */
export async function resolveCaliberId(rawName: string, emptyMessage = 'Caliber is required.'): Promise<string> {
  const name = (rawName ?? '').trim()
  if (!name) throw new Error(emptyMessage)

  const existing = await prisma.caliber.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing.id

  try {
    const created = await prisma.caliber.create({ data: { name } })
    return created.id
  } catch (e) {
    // Lost a race to a concurrent create: the unique index on name rejected us,
    // so the row now exists — re-query and use it.
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      const raced = await prisma.caliber.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      })
      if (raced) return raced.id
    }
    throw e
  }
}
