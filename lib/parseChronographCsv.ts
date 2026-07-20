export interface ParsedShot {
  shotIndex: number
  velocity: number
}

export interface ParsedChronograph {
  shots: ParsedShot[]
  velocityMin: number
  velocityMax: number
  velocityAvg: number
  extremeSpread: number
  stdDev: number
  roundsFired: number
}

export class ChronoCsvError extends Error {
  readonly kind: 'header' | 'noShots' | 'parse'
  constructor(kind: ChronoCsvError['kind'], message: string) {
    super(message)
    this.name = 'ChronoCsvError'
    this.kind = kind
  }
}

export function parseChronographCsv(text: string): ParsedChronograph {
  const lines = text.split(/\r?\n/).map((l) => l.trim())

  // Recognize both Xero C1 variants:
  //   Original C1:  `# Shot,Speed (mps),...`
  //   Garmin Xero:  `#,SPEED (MPS),...`
  // Match case-insensitively on the first two cells: the first must be `#` or
  // `# Shot`, the second must start with `speed` and contain `mps`.
  const headerIdx = lines.findIndex((l) => isHeaderRow(l))
  if (headerIdx === -1) {
    throw new ChronoCsvError('header', 'Not a recognized chronograph export (missing expected header).')
  }

  const shots: ParsedShot[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') continue
    const firstCell = line.split(',')[0]
    if (!/^\d+$/.test(firstCell)) break
    const cells = line.split(',')
    const shotIndex = Number.parseInt(firstCell, 10)
    const velocityStr = cells[1]
    const velocity = Number(velocityStr)
    if (!Number.isFinite(velocity)) {
      throw new ChronoCsvError('parse', `Could not parse velocity on shot ${shotIndex}: "${velocityStr}".`)
    }
    shots.push({ shotIndex, velocity })
  }

  if (shots.length < 2) {
    throw new ChronoCsvError('noShots', 'No shots found in the CSV (at least 2 required).')
  }

  return computeAggregates(shots)
}

function isHeaderRow(line: string): boolean {
  const cells = line.split(',').map((c) => c.trim().toLowerCase())
  const first = cells[0]
  const second = cells[1] ?? ''
  return (first === '#' || first === '# shot') && second.startsWith('speed') && second.includes('mps')
}

export function computeAggregates(shots: ParsedShot[]): ParsedChronograph {
  const velocities = shots.map((s) => s.velocity)
  const min = Math.min(...velocities)
  const max = Math.max(...velocities)
  const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length
  const stdDev = Math.sqrt(
    velocities.reduce((sum, v) => sum + (v - avg) ** 2, 0) / velocities.length,
  )

  return {
    shots,
    velocityMin: Math.round(min),
    velocityMax: Math.round(max),
    velocityAvg: Math.round(avg),
    extremeSpread: Math.round((max - min) * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    roundsFired: shots.length,
  }
}