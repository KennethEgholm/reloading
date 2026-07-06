import { describe, it, expect } from 'vitest'
import {
  extractShotsFromSheets,
  ChronoXlsxError,
  type GarminSheet,
} from './parseGarminXlsx'

function garminSheet(shots: Array<[number, string]>, title = 'Rifle sessio_2026-07-06_17-12_1'): GarminSheet {
  const data: GarminSheet['data'] = [
    ['Rifle session started at 17:12', null, null, null, null, null, null, null, null],
    ['#', 'Speed (mps)', 'Δ AVG (mps)', 'KE (J)', 'Power Factor (N⋅s)', 'Time', 'Clean Bore', 'Cold Bore', 'Shot Notes'],
    ...shots.map(([idx, v]) => [String(idx), v, '0.0', null, null, '17.12.31', null, null, null] as GarminSheet['data'][number]),
    [null, null, null, null, null, null, null, null, null],
    ['AVERAGE SPEED', '859.5', null, null, null, null, null, null, null],
    ['STD DEV', '12.9', null, null, null, null, null, null, null],
    ['SPREAD', '35.9', null, null, null, null, null, null, null],
    ['SESSION NOTE', null, null, null, null, null, null, null, null],
    ['DATE', '6 July 2026 at 17.12', null, null, null, null, null, null, null],
    ['All shots included in the calculations', null, null, null, null, null, null, null, null],
  ]
  return { sheet: title, data }
}

describe('extractShotsFromSheets', () => {
  it('collapses shots across multiple sheets into one renumbered list', () => {
    const sheets = [
      garminSheet([[1, '859.2'], [2, '856.0'], [3, '843.4'], [4, '879.4']]),
      garminSheet([[1, '856.4'], [2, '866.1'], [3, '874.2'], [4, '875.3'], [5, '880.1']], 'Rifle sessio_2026-07-06_17-01_2'),
    ]
    const shots = extractShotsFromSheets(sheets)
    expect(shots).toHaveLength(9)
    expect(shots[0]).toEqual({ shotIndex: 1, velocity: 859.2 })
    expect(shots[3]).toEqual({ shotIndex: 4, velocity: 879.4 })
    expect(shots[4]).toEqual({ shotIndex: 5, velocity: 856.4 })
    expect(shots[8]).toEqual({ shotIndex: 9, velocity: 880.1 })
  })

  it('throws ChronoXlsxError kind=header when no sheet has the expected header', () => {
    const sheets = [{ sheet: 'x', data: [['foo', 'bar'], ['1', '900']] }]
    expect(() => extractShotsFromSheets(sheets)).toThrow(ChronoXlsxError)
    try {
      extractShotsFromSheets(sheets)
    } catch (e) {
      expect((e as ChronoXlsxError).kind).toBe('header')
    }
  })

  it('throws ChronoXlsxError kind=noShots when the combined shot count is < 2', () => {
    const sheets = [garminSheet([[1, '900.0']])]
    expect(() => extractShotsFromSheets(sheets)).toThrow(ChronoXlsxError)
    try {
      extractShotsFromSheets(sheets)
    } catch (e) {
      expect((e as ChronoXlsxError).kind).toBe('noShots')
    }
  })

  it('throws ChronoXlsxError kind=noShots when every sheet has zero shot rows', () => {
    const sheets = [garminSheet([]), garminSheet([])]
    expect(() => extractShotsFromSheets(sheets)).toThrow(ChronoXlsxError)
    try {
      extractShotsFromSheets(sheets)
    } catch (e) {
      expect((e as ChronoXlsxError).kind).toBe('noShots')
    }
  })

  it('throws ChronoXlsxError kind=parse when a shot velocity cell is non-numeric', () => {
    const sheets = [garminSheet([[1, '859.2'], [2, 'fast'], [3, '843.4']])]
    expect(() => extractShotsFromSheets(sheets)).toThrow(ChronoXlsxError)
    try {
      extractShotsFromSheets(sheets)
    } catch (e) {
      expect((e as ChronoXlsxError).kind).toBe('parse')
    }
  })

  it('skips a sheet with no header and uses shots from a sheet that has one', () => {
    const sheets = [
      { sheet: 'garbage', data: [['hello'], ['world']] } as GarminSheet,
      garminSheet([[1, '900.0'], [2, '910.0']]),
    ]
    const shots = extractShotsFromSheets(sheets)
    expect(shots).toHaveLength(2)
    expect(shots[1]).toEqual({ shotIndex: 2, velocity: 910.0 })
  })

  it('stops reading shots at the blank row before the AVERAGE SPEED summary', () => {
    const sheets = [garminSheet([[1, '900.0'], [2, '910.0'], [3, '920.0']])]
    const shots = extractShotsFromSheets(sheets)
    expect(shots).toHaveLength(3)
  })
})
