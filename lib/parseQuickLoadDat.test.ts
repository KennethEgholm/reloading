import { describe, it, expect } from 'vitest'
import { parseQuickLoadDat, QuickLoadParseError } from './parseQuickLoadDat'

const SAMPLE = `[startup]
commen=Med Norma 202
pricomment=
[metrics]
pattyp=.30-06 Spring.  (SAAMI)
laflen= 20.1968503937008
patlan= 3.34015748031496
sdepth= .235826771653543
hullen= 2.49409448818898
kalzug= .307874015748032
sebert= .55
volful= 67.5047466078766
wirkqu= 47.52
wirktr= 0
brennr= 63.4121631068018
gesweg= 455.64
maxzul= 413.686
pmetho=Piezo SAAMI
bultyp=.308, 150, Hornady FMJ-BT 3037
bulgew= 150.00252319116
bullen= 1.08188976377953
conlen= 3.68
condia= 6.78
condid= 7.82
ausinn= 2
buldia= .307874015748032
[chargedata]
pulver=Norma 202
abkof0= .59
abkof1= 1.7102
exwarm= 3940
kappax= 1.225
powden= 1.6
prodeg= 1.5
powwht= 49
limiz1= .435
anfdru= 25000000
anfpul= 1.89430122989869E-02
bulkdn= .905
powtmp= 21
primer=
PrimerLot=
BulletLot=
PowderLot=
CaseMfg=
MuzzleVel_meas=
MVel_meas_std=
MVel_meas_unit=
Press_meas=
Press_meas_std=
Press_meas_unit=`

describe('parseQuickLoadDat', () => {
  it('parses the sample QuickLoad .dat export', () => {
    const r = parseQuickLoadDat(SAMPLE)
    expect(r.name).toBe('Med Norma 202')
    expect(r.caliber).toBe('.30-06 Spring.')
    expect(r.bulletBrand).toBe('Hornady')
    expect(r.bulletType).toBe('FMJ-BT 3037')
    expect(r.bulletWeightGr).toBeCloseTo(150, 0)
    expect(r.bulletCaliber).toBe('.308')
    expect(r.propellantBrand).toBe('Norma')
    expect(r.propellantType).toBe('202')
    expect(r.chargeGr).toBe(49)
    expect(r.coal).toBe(3.68)
    expect(r.measuredV0).toBeNull()
  })

  it('sets calculatedV0 and fillRate to null (not carried by .dat exports)', () => {
    const r = parseQuickLoadDat(SAMPLE)
    expect(r.calculatedV0).toBeNull()
    expect(r.fillRate).toBeNull()
  })

  it('parses measured muzzle velocity when present', () => {
    const dat = SAMPLE.replace('MuzzleVel_meas=', 'MuzzleVel_meas=450.5')
    const r = parseQuickLoadDat(dat)
    expect(r.measuredV0).toBeCloseTo(450.5, 1)
  })

  it('throws QuickLoadParseError kind=format for a non-QuickLoad file', () => {
    expect(() => parseQuickLoadDat('hello world\nfoo=bar')).toThrow(QuickLoadParseError)
    try {
      parseQuickLoadDat('hello world\nfoo=bar')
    } catch (e) {
      expect((e as QuickLoadParseError).kind).toBe('format')
    }
  })

  it('throws QuickLoadParseError kind=format for an empty file', () => {
    expect(() => parseQuickLoadDat('')).toThrow(QuickLoadParseError)
    try {
      parseQuickLoadDat('')
    } catch (e) {
      expect((e as QuickLoadParseError).kind).toBe('format')
    }
  })

  it('handles CRLF line endings', () => {
    const crlf = SAMPLE.replace(/\n/g, '\r\n')
    const r = parseQuickLoadDat(crlf)
    expect(r.name).toBe('Med Norma 202')
    expect(r.propellantBrand).toBe('Norma')
  })

  it('generates a fallback name when commen is empty', () => {
    const dat = SAMPLE.replace('commen=Med Norma 202', 'commen=')
    const r = parseQuickLoadDat(dat)
    expect(r.name).toBe('.30-06 Spring. Hornady FMJ-BT 3037')
  })

  it('extracts bullet weight from bulgew even if bultyp weight is missing', () => {
    const dat = SAMPLE.replace('bultyp=.308, 150, Hornady FMJ-BT 3037', 'bultyp=.308, , Hornady FMJ-BT 3037')
    const r = parseQuickLoadDat(dat)
    expect(r.bulletWeightGr).toBeCloseTo(150, 0)
  })

  it('includes pricomment in notes when present', () => {
    const dat = SAMPLE.replace('pricomment=', 'pricomment=Test batch for accuracy')
    const r = parseQuickLoadDat(dat)
    expect(r.notes).toBe('QuickLoad: Test batch for accuracy')
  })
})