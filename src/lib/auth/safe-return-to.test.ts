import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './safe-return-to'

describe('safeReturnTo', () => {
  it('returns the path when input is a same-origin local path', () => {
    expect(safeReturnTo('/dashboard')).toBe('/dashboard')
    expect(safeReturnTo('/foo/bar?x=1#h')).toBe('/foo/bar?x=1#h')
  })

  it('falls back when input is null/undefined/empty/non-leading-slash', () => {
    expect(safeReturnTo(null)).toBe('/')
    expect(safeReturnTo(undefined)).toBe('/')
    expect(safeReturnTo('')).toBe('/')
    expect(safeReturnTo('foo')).toBe('/')
    expect(safeReturnTo('http://evil.com')).toBe('/')
    expect(safeReturnTo('javascript:alert(1)')).toBe('/')
  })

  it('blocks protocol-relative redirects', () => {
    expect(safeReturnTo('//evil.com')).toBe('/')
    expect(safeReturnTo('//evil.com/path')).toBe('/')
  })

  it('blocks backslash-prefixed redirects (URL spec normalises \\ to /)', () => {
    expect(safeReturnTo('/\\evil.com')).toBe('/')
    expect(safeReturnTo('/\\\\evil.com')).toBe('/')
  })

  it('honours custom fallback', () => {
    expect(safeReturnTo(null, '/dashboard')).toBe('/dashboard')
    expect(safeReturnTo('//evil.com', '/dashboard')).toBe('/dashboard')
  })
})
