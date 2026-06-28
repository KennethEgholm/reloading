import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    caliber: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { resolveCaliberId } from './resolveCaliber'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveCaliberId', () => {
  it('returns the id of an existing caliber (case-insensitive, trimmed)', async () => {
    prismaMock.caliber.findFirst.mockResolvedValue({ id: 'cal-1', name: '.308 Win' })

    const id = await resolveCaliberId('  .308 win  ')

    expect(id).toBe('cal-1')
    expect(prismaMock.caliber.create).not.toHaveBeenCalled()
    // Looks up by the trimmed value, case-insensitively.
    expect(prismaMock.caliber.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: '.308 win', mode: 'insensitive' } },
    })
  })

  it('creates a new caliber when none matches, storing the trimmed name', async () => {
    prismaMock.caliber.findFirst.mockResolvedValue(null)
    prismaMock.caliber.create.mockResolvedValue({ id: 'cal-new', name: '6.5 Creedmoor' })

    const id = await resolveCaliberId('  6.5 Creedmoor ')

    expect(id).toBe('cal-new')
    expect(prismaMock.caliber.create).toHaveBeenCalledWith({ data: { name: '6.5 Creedmoor' } })
  })

  it('throws on an empty / whitespace-only name', async () => {
    await expect(resolveCaliberId('   ')).rejects.toThrow()
    expect(prismaMock.caliber.findFirst).not.toHaveBeenCalled()
  })

  it('recovers from a unique-constraint race by re-querying', async () => {
    // Two concurrent callers: findFirst misses, create hits the unique index.
    prismaMock.caliber.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'cal-raced', name: '.223 Rem' })
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    prismaMock.caliber.create.mockRejectedValue(p2002)

    const id = await resolveCaliberId('.223 Rem')

    expect(id).toBe('cal-raced')
    expect(prismaMock.caliber.findFirst).toHaveBeenCalledTimes(2)
  })
})
