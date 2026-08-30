import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Node = string | { [key: string]: Node }

function loadMessages(locale: string): Record<string, Node> {
  const raw = readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf-8')
  return JSON.parse(raw) as Record<string, Node>
}

function flattenKeys(node: Node, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('i18n message parity (en/da)', () => {
  const en = flattenKeys(loadMessages('en')).sort()
  const da = flattenKeys(loadMessages('da')).sort()

  it('both dictionaries are non-empty', () => {
    expect(en.length).toBeGreaterThan(0)
    expect(da.length).toBeGreaterThan(0)
  })

  it('every en key exists in da and vice versa', () => {
    const enSet = new Set(en)
    const daSet = new Set(da)
    const missingInDa = en.filter((key) => !daSet.has(key))
    const missingInEn = da.filter((key) => !enSet.has(key))
    expect(
      { missingInDa, missingInEn },
      `i18n drift — missing keys must be added to BOTH messages/en.json and messages/da.json`,
    ).toEqual({ missingInDa: [], missingInEn: [] })
  })
})