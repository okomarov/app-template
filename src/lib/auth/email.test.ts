import { describe, expect, it } from 'vitest'
import { getAuthEmailDomain, isAllowedAuthEmail, nameFromEmail, normalizeAuthEmail } from './email'

describe('auth email domains', () => {
  it('normalizes email addresses before validation', () => {
    expect(normalizeAuthEmail('  User@EXAMPLE.COM  ')).toBe('user@example.com')
    expect(getAuthEmailDomain('  Person@Example.com  ')).toBe('example.com')
  })

  it('accepts exact allowed domains case-insensitively', () => {
    expect(isAllowedAuthEmail('user@example.com')).toBe(true)
    expect(isAllowedAuthEmail('user@EXAMPLE.COM')).toBe(true)
  })

  it('rejects other domains and allowed-domain subdomains', () => {
    expect(isAllowedAuthEmail('user@other.com')).toBe(false)
    expect(isAllowedAuthEmail('user@sub.example.com')).toBe(false)
  })

  it('rejects malformed email-like input', () => {
    expect(isAllowedAuthEmail('')).toBe(false)
    expect(isAllowedAuthEmail('example.com')).toBe(false)
    expect(isAllowedAuthEmail('@example.com')).toBe(false)
    expect(isAllowedAuthEmail('user@')).toBe(false)
    expect(isAllowedAuthEmail('user@@example.com')).toBe(false)
  })
})

describe('nameFromEmail', () => {
  it('title-cases the local part', () => {
    expect(nameFromEmail('alex@example.com')).toBe('Alex')
    expect(nameFromEmail('ALEX@example.com')).toBe('Alex')
  })

  it('splits separators into words', () => {
    expect(nameFromEmail('ada.lovelace@example.com')).toBe('Ada Lovelace')
    expect(nameFromEmail('first_last@example.com')).toBe('First Last')
    expect(nameFromEmail('first-middle.last@example.com')).toBe('First Middle Last')
  })

  it('returns empty for input without a local part', () => {
    expect(nameFromEmail('')).toBe('')
    expect(nameFromEmail('@example.com')).toBe('')
  })
})
