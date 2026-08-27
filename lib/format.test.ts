import { describe, it, expect } from 'vitest'
import { formatBc, formatBcSuffix } from './format'

describe('formatBc', () => {
  it('returns empty when both are unset', () => {
    expect(formatBc(null, null)).toBe('')
    expect(formatBc(undefined, undefined)).toBe('')
  })

  it('formats a single model', () => {
    expect(formatBc(0.462, null)).toBe('G1 0.462')
    expect(formatBc(null, 0.237)).toBe('G7 0.237')
  })

  it('formats both models', () => {
    expect(formatBc(0.462, 0.237)).toBe('G1 0.462 / G7 0.237')
  })
})

describe('formatBcSuffix', () => {
  it('returns empty when both are unset', () => {
    expect(formatBcSuffix(null, null)).toBe('')
  })

  it('prefixes a comma', () => {
    expect(formatBcSuffix(0.462, 0.237)).toBe(', G1 0.462 / G7 0.237')
  })
})
