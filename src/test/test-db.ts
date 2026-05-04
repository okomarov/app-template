// Single source of truth for the integration test database. Imported by
// vitest.config.mts (DATABASE_URL env), src/test/integration-setup.ts
// (globalSetup), and src/test/factories.ts (assertTestDatabase guard).

export const TEST_DB_NAME = 'postgres_test'
const HOST_PORT = '127.0.0.1:54322'
const CREDS = 'postgres:postgres'

export const ADMIN_URL = `postgresql://${CREDS}@${HOST_PORT}/postgres`
export const TEST_URL = `postgresql://${CREDS}@${HOST_PORT}/${TEST_DB_NAME}`

export function assertTestDatabase(): void {
  let dbName = ''
  try {
    dbName = new URL(process.env.DATABASE_URL ?? '').pathname.replace(/^\//, '')
  } catch {
    // empty dbName falls through to the suffix check
  }
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `cleanTestData refused to run: DATABASE_URL must point at a database whose name ends in '_test'. Got: ${dbName || '<unparseable>'}`,
    )
  }
}
