import {
  computeAggregates,
  type ParsedShot,
  type ParsedChronograph,
} from './parseChronographCsv'

export type CellValue = string | number | boolean | Date | null

export interface GarminSheet {
  sheet: string
  data: CellValue[][]
}

export class ChronoXlsxError extends Error {
  readonly kind: 'header' | 'noShots' | 'parse'
  constructor(kind: ChronoXlsxError['kind'], message: string) {
    super(message)
    this.name = 'ChronoXlsxError'
    this.kind = kind
  }
}

const HEADER_FIRST_CELL = '#'
const HEADER_SECOND_CELL = 'Speed (mps)'

function isHeaderRow(row: CellValue[]): boolean {
  return (
    typeof row[0] === 'string' && row[0].trim() === HEADER_FIRST_CELL &&
    typeof row[1] === 'string' && row[1].trim() === HEADER_SECOND_CELL
  )
}

function parseVelocity(cell: CellValue, shotNum: number): number {
  if (typeof cell === 'number' && Number.isFinite(cell)) return cell
  if (typeof cell === 'string') {
    const v = Number(cell.trim())
    if (Number.isFinite(v)) return v
  }
  throw new ChronoXlsxError('parse', `Could not parse velocity on shot ${shotNum}: "${String(cell)}".`)
}

export function extractShotsFromSheets(sheets: GarminSheet[]): ParsedShot[] {
  const shots: ParsedShot[] = []
  let foundAnyHeader = false

  for (const { data } of sheets) {
    const headerIdx = data.findIndex(isHeaderRow)
    if (headerIdx === -1) continue
    foundAnyHeader = true

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i]
      const first = row[0]
      if (typeof first !== 'string' && typeof first !== 'number') break
      const idxStr = typeof first === 'number' ? String(first) : first.trim()
      if (!/^\d+$/.test(idxStr)) break
      const velocity = parseVelocity(row[1], Number(idxStr))
      shots.push({ shotIndex: 0, velocity })
    }
  }

  if (!foundAnyHeader) {
    throw new ChronoXlsxError('header', 'No sheet contained a recognized Garmin chronograph header row.')
  }

  if (shots.length < 2) {
    throw new ChronoXlsxError('noShots', 'No shots found across sheets (at least 2 required).')
  }

  return shots.map((s, i) => ({ shotIndex: i + 1, velocity: s.velocity }))
}

export function parseGarminXlsxResult(sheets: GarminSheet[]): ParsedChronograph {
  return computeAggregates(extractShotsFromSheets(sheets))
}