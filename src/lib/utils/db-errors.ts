function hasCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string'
  )
}

export function isUniqueViolation(error: unknown): boolean {
  if (hasCode(error) && error.code === '23505') return true
  if (error instanceof Error && hasCode(error.cause) && error.cause.code === '23505') return true
  return false
}
