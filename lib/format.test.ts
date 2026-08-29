import { describe, it, expect } from 'vitest'
import { formatBc, formatBcSuffix, formatTwistSuffix } from './format'

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

describe('formatTwistSuffix', () => {
  it('returns empty when unset', () => {
    expect(formatTwistSuffix(null)).toBe('')
    expect(formatTwistSuffix(undefined)).toBe('')
  })

  it('formats 1:N', () => {
    expect(formatTwistSuffix(10)).toBe(', 1:10')
  })
})
