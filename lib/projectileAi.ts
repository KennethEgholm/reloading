export type ProjectileFillNeeds = {
  id: string
  needTwist: boolean
  needG1: boolean
  needG7: boolean
}

export type ProjectileAiSuggestion = {
  id: string
  preferredTwistIn: number | null
  bcG1: number | null
  bcG7: number | null
}

export function projectileNeedsFill(p: {
  preferredTwistIn: number | null
  bcG1: number | null
  bcG7: number | null
}): boolean {
  return p.preferredTwistIn == null || p.bcG1 == null || p.bcG7 == null
}

export function fillNeeds(p: {
  id: string
  preferredTwistIn: number | null
  bcG1: number | null
  bcG7: number | null
}): ProjectileFillNeeds {
  return {
    id: p.id,
    needTwist: p.preferredTwistIn == null,
    needG1: p.bcG1 == null,
    needG7: p.bcG7 == null,
  }
}

function positiveInRange(v: unknown, minExclusive: number, maxExclusive: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n) || n <= minExclusive || n >= maxExclusive) return null
  return n
}

export function sanitizeProjectileSuggestion(
  raw: unknown,
  needs: ProjectileFillNeeds,
): ProjectileAiSuggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : ''
  if (id !== needs.id) return null

  const preferredTwistIn = needs.needTwist ? positiveInRange(o.preferredTwistIn, 0, 60) : null
  const bcG1 = needs.needG1 ? positiveInRange(o.bcG1, 0, 1.5) : null
  const bcG7 = needs.needG7 ? positiveInRange(o.bcG7, 0, 1.5) : null
  if (preferredTwistIn == null && bcG1 == null && bcG7 == null) return null
  return { id, preferredTwistIn, bcG1, bcG7 }
}

export function sanitizeProjectileSuggestions(
  raw: unknown,
  needsById: Map<string, ProjectileFillNeeds>,
): ProjectileAiSuggestion[] {
  let list: unknown[] = []
  if (Array.isArray(raw)) list = raw
  else if (raw && typeof raw === 'object' && Array.isArray((raw as { suggestions?: unknown }).suggestions)) {
    list = (raw as { suggestions: unknown[] }).suggestions
  }
  const out: ProjectileAiSuggestion[] = []
  for (const item of list) {
    const id = item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
      ? (item as { id: string }).id
      : null
    if (!id) continue
    const needs = needsById.get(id)
    if (!needs) continue
    const parsed = sanitizeProjectileSuggestion(item, needs)
    if (parsed) out.push(parsed)
  }
  return out
}
