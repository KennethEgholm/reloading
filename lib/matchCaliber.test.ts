import { describe, it, expect } from 'vitest'
import { matchExistingCaliber, normalizeCaliber } from './matchCaliber'

describe('normalizeCaliber', () => {
  it('strips punctuation, spaces, case, and common designation suffixes', () => {
    expect(normalizeCaliber('.30-06 Spring')).toBe('3006')
    expect(normalizeCaliber('30-06')).toBe('3006')
    expect(normalizeCaliber('.308 Win')).toBe('308')
    expect(normalizeCaliber('308')).toBe('308')
    expect(normalizeCaliber('.308 Winchester')).toBe('308')
    expect(normalizeCaliber('5.56 NATO')).toBe('556')
    expect(normalizeCaliber('.300 Win Mag')).toBe('300')
  })
})

describe('matchExistingCaliber', () => {
  const calibers = [
    { id: 'c1', name: '.30-06 Spring' },
    { id: 'c2', name: '.308 Win' },
    { id: 'c3', name: '6.5 Creedmoor' },
  ]

  it('matches a bare designation to the existing canonical name', () => {
    expect(matchExistingCaliber('30-06', calibers)).toBe('.30-06 Spring')
    expect(matchExistingCaliber('308', calibers)).toBe('.308 Win')
  })

  it('matches case- and punctuation-insensitively', () => {
    expect(matchExistingCaliber('.308 winchester', calibers)).toBe('.308 Win')
  })

  it('returns the original name when nothing matches (caller creates new)', () => {
    expect(matchExistingCaliber('.223 Rem', calibers)).toBe('.223 Rem')
  })

  it('prefers an exact (case-insensitive) name match over a normalized one', () => {
    const list = [
      { id: 'a', name: '.308 Win' },
      { id: 'b', name: '308' },
    ]
    // Typed exactly "308" -> keep the exact "308" row, don't rewrite to ".308 Win".
    expect(matchExistingCaliber('308', list)).toBe('308')
  })

  it('passes through empty input unchanged', () => {
    expect(matchExistingCaliber('', calibers)).toBe('')
    expect(matchExistingCaliber('   ', calibers)).toBe('   ')
  })
})
