import { sql } from 'kysely'
import { db } from '@/db'
import type { NewUser } from '@/db/types'
import { assertTestDatabase } from './test-db'

export async function cleanTestData() {
  assertTestDatabase()
  await sql`TRUNCATE users CASCADE`.execute(db)
}

export async function createTestUser(overrides: Partial<NewUser> = {}) {
  const defaults: NewUser = {
    guid: crypto.randomUUID(),
    name: 'Test User',
    email: `test-${crypto.randomUUID()}@example.com`,
    ...overrides,
  }

  return db.insertInto('users').values(defaults).returningAll().executeTakeFirstOrThrow()
}
