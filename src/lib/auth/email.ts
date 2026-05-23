// Configure for your product: drop in the email domains allowed to self-serve
// signup. An empty array effectively disables signup. Subdomains are not
// matched — only exact domain equality.
export const ALLOWED_AUTH_EMAIL_DOMAINS = ['example.com'] as const

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getAuthEmailDomain(email: string): string | null {
  const normalized = normalizeAuthEmail(email)
  const parts = normalized.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return parts[1]
}

export function isAllowedAuthEmail(email: string): boolean {
  const domain = getAuthEmailDomain(email)
  return domain !== null && ALLOWED_AUTH_EMAIL_DOMAINS.some((allowed) => allowed === domain)
}

// "alex@example.com" → "Alex"; "ada.lovelace@example.com" → "Ada Lovelace"
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
