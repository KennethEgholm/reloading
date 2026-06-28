export interface ParsedQuickLoad {
  name: string
  caliber: string
  bulletBrand: string
  bulletType: string
  bulletWeightGr: number
  bulletCaliber: string
  propellantBrand: string
  propellantType: string
  chargeGr: number
  coal: number
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
  notes: string
}

export class QuickLoadParseError extends Error {
  readonly kind: 'format' | 'noData'
  constructor(kind: QuickLoadParseError['kind'], message: string) {
    super(message)
    this.name = 'QuickLoadParseError'
    this.kind = kind
  }
}

export function parseQuickLoadDat(text: string): ParsedQuickLoad {
  const lines = text.split(/\r?\n/).map((l) => l.trim())

  const sections: Record<string, Record<string, string>> = {}
  let currentSection = ''

  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1)
      sections[currentSection] = {}
      continue
    }
    if (!line || !currentSection) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    const value = line.slice(eqIdx + 1).trim()
    sections[currentSection][key] = value
  }

  const metrics = sections['metrics'] || {}
  const charge = sections['chargedata'] || {}
  const startup = sections['startup'] || {}

  if (!metrics.pattyp && !charge.pulver) {
    throw new QuickLoadParseError('format', 'Not a recognized QuickLoad .dat file (missing [metrics] or [chargedata] sections).')
  }

  const name = startup.commen || ''
  const caliber = cleanCaliber(metrics.pattyp || '')

  const bultyp = metrics.bultyp || ''
  const bulletParts = parseBulletType(bultyp)
  const bulletWeightGr = parseFloat(metrics.bulgew) || bulletParts.weight || 0
  const bulletCaliber = bulletParts.caliber || ''
  const bulletBrand = bulletParts.brand || ''
  const bulletType = bulletParts.type || ''

  const pulver = charge.pulver || ''
  const propellantParts = parsePropellant(pulver)

  const chargeGr = parseFloat(charge.powwht) || 0
  const coal = parseFloat(metrics.conlen) || 0
  const measuredV0 = charge.MuzzleVel_meas ? parseFloat(charge.MuzzleVel_meas) : null
  // QuickLoad .dat exports don't carry the computed muzzle velocity or % case
  // fill in a field we parse, so these stay null here. The screenshot import
  // populates them from the on-screen QuickLoad results instead.
  const calculatedV0 = null
  const fillRate = null
  const notes = buildNotes(startup.pricomment || '')

  return {
    name: name || `${caliber} ${bulletBrand} ${bulletType}`.trim() || 'Imported recipe',
    caliber,
    bulletBrand,
    bulletType,
    bulletWeightGr,
    bulletCaliber,
    propellantBrand: propellantParts.brand,
    propellantType: propellantParts.type,
    chargeGr,
    coal,
    calculatedV0,
    measuredV0,
    fillRate,
    notes,
  }
}

function cleanCaliber(raw: string): string {
  return raw.replace(/\s*\(SAAMI\)|\s*\(CIP\)|\s*\.\s*$/g, '').trim()
}

function parseBulletType(raw: string): { caliber: string; weight: number | null; brand: string; type: string } {
  const parts = raw.split(',').map((p) => p.trim())
  const caliber = parts[0] || ''
  const weight = parts[1] ? parseFloat(parts[1]) : null
  const brandType = parts.slice(2).join(', ').trim()
  const spaceIdx = brandType.indexOf(' ')
  const brand = spaceIdx > 0 ? brandType.slice(0, spaceIdx) : brandType
  const type = spaceIdx > 0 ? brandType.slice(spaceIdx + 1) : ''
  return { caliber, weight, brand, type }
}

function parsePropellant(raw: string): { brand: string; type: string } {
  const spaceIdx = raw.indexOf(' ')
  if (spaceIdx > 0) return { brand: raw.slice(0, spaceIdx), type: raw.slice(spaceIdx + 1) }
  return { brand: raw, type: '' }
}

function buildNotes(pricomment: string): string {
  if (!pricomment) return ''
  return `QuickLoad: ${pricomment}`
}