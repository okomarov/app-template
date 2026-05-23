// URL spec normalises `\` -> `/`, so `/\evil.com` becomes `//evil.com` after
// parsing — protocol-relative and a redirect off-host. Use a dummy base origin
// so any input that resolves to a different origin is rejected.
const PLACEHOLDER_BASE = 'http://x.invalid'

export function safeReturnTo(raw: string | null | undefined, fallback = '/'): string {
  if (!raw?.startsWith('/')) return fallback
  try {
    const parsed = new URL(raw, PLACEHOLDER_BASE)
    if (parsed.origin !== PLACEHOLDER_BASE) return fallback
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return fallback
  }
}
