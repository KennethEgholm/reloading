import { describe, it, expect } from 'vitest'
import { parseChronographCsv, ChronoCsvError } from './parseChronographCsv'

const SAMPLE = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,958.2,4.3,1844.5,3.8,12:41:36 PM,Clean Bore,
2,954.1,0.1,1828.6,3.8,12:47:57 PM,,
3,956.1,2.1,1836.1,3.8,12:48:41 PM,,
4,952.1,-1.8,1821.1,3.8,12:51:37 PM,,
5,957.9,3.9,1843.0,3.8,12:52:49 PM,,
6,953.1,-0.8,1824.8,3.8,12:53:32 PM,,
7,953.7,-0.3,1826.9,3.8,12:55:51 PM,,
8,955.8,1.8,1835.0,3.8,12:56:36 PM,,
9,950.4,-3.5,1814.5,3.8,12:57:51 PM,,
10,956.2,2.3,1836.8,3.8,1:00:23 PM,,
11,956.7,2.7,1838.5,3.8,1:06:41 PM,,
12,946.8,-7.1,1800.9,3.8,1:11:40 PM,,
13,954.8,0.8,1831.2,3.8,1:13:21 PM,,
14,953.8,-0.2,1827.3,3.8,1:13:38 PM,,
15,949.6,-4.4,1811.2,3.8,1:13:47 PM,,

AVERAGE SPEED,953.9,,,,,,
STD DEV,3.1,,,,,,
SPREAD,11.4,,,,,,
AVERAGE POWER FACTOR,3.8,,,,,,
PROJECTILE WEIGHT (gr),62.0,,,,,,
SESSION NOTES,,,,,,,
DATE,April 23, 2025 at 12:40 PM,,,,,,
All shots included in the calculations,,,,,,,`

describe('parseChronographCsv', () => {
  it('parses the sample Xero C1 export and computes aggregates', () => {
    const r = parseChronographCsv(SAMPLE)
    expect(r.shots).toHaveLength(15)
    expect(r.shots[0]).toEqual({ shotIndex: 1, velocity: 958.2 })
    expect(r.shots[14]).toEqual({ shotIndex: 15, velocity: 949.6 })
    expect(r.roundsFired).toBe(15)
    expect(r.velocityMin).toBeCloseTo(946.8, 1)
    expect(r.velocityMax).toBeCloseTo(958.2, 1)
    expect(r.velocityAvg).toBeCloseTo(953.95, 1)
    expect(r.extremeSpread).toBeCloseTo(11.4, 1)
    expect(r.stdDev).toBeCloseTo(3.1, 0)
  })

  it('throws ChronoCsvError kind=header when the header row is missing', () => {
    expect(() => parseChronographCsv('foo,bar\n1,2')).toThrow(ChronoCsvError)
    try {
      parseChronographCsv('foo,bar\n1,2')
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('header')
    }
  })

  it('throws ChronoCsvError kind=noShots when there are zero shots', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes

AVERAGE SPEED,0,,,,,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('noShots')
    }
  })

  it('throws ChronoCsvError kind=noShots when there is a single shot', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,950.0,0,0,0,12:00:00 PM,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('noShots')
    }
  })

  it('ignores the trailing aggregate rows', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,950.0,0,0,0,12:00:00 PM,,
2,960.0,10,0,0,12:01:00 PM,,
AVERAGE SPEED,955,,,,,,`
    const r = parseChronographCsv(csv)
    expect(r.shots).toHaveLength(2)
  })

  it('handles CRLF line endings', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes\r\n1,950.0,0,0,0,12:00:00 PM,,\r\n2,960.0,10,0,0,12:01:00 PM,,\r\n`
    const r = parseChronographCsv(csv)
    expect(r.shots).toHaveLength(2)
    expect(r.velocityMin).toBe(950.0)
  })

  it('throws ChronoCsvError kind=parse when a shot velocity is non-numeric', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,fast,0,0,0,12:00:00 PM,,
2,960.0,10,0,0,12:01:00 PM,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('parse')
    }
  })
})