export type DetectedExportType =
  | 'inventory'
  | 'recipes'
  | 'rifles'
  | 'loadLogs'
  | 'rangeLogs'
  | 'factoryAmmo'
  | 'everything'

export function detectExportType(text: string): DetectedExportType | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

    // Full bundle: nested per-domain objects (not top-level arrays).
    if (isNestedObject(parsed.inventory) && isNestedObject(parsed.recipes)) {
      return 'everything'
    }
    if (Array.isArray(parsed.recipes)) return 'recipes'
    if (Array.isArray(parsed.rifles)) return 'rifles'
    if (Array.isArray(parsed.loadLogs)) return 'loadLogs'
    if (Array.isArray(parsed.rangeLogs)) return 'rangeLogs'
    if (Array.isArray(parsed.factoryAmmo)) return 'factoryAmmo'
    if (
      Array.isArray(parsed.primers) ||
      Array.isArray(parsed.projectiles) ||
      Array.isArray(parsed.propellants) ||
      Array.isArray(parsed.cartridges)
    ) {
      return 'inventory'
    }
    return null
  } catch {
    return null
  }
}

export function inventoryHasData(value: unknown): boolean {
  if (!isNestedObject(value)) return false
  return (['primers', 'projectiles', 'propellants', 'cartridges'] as const).some(
    (key) => Array.isArray(value[key]) && (value[key] as unknown[]).length > 0,
  )
}

export function sectionHasData(value: unknown, key: string): boolean {
  if (!isNestedObject(value)) return false
  const arr = value[key]
  return Array.isArray(arr) && arr.length > 0
}

function isNestedObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
