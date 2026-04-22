import { sql } from 'kysely'
import { db } from '@/db'
import type { NewUser } from '@/db/types'

export async function cleanTestData() {
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
