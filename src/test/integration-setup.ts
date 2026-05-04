// Vitest globalSetup. See CLAUDE.md > Test database isolation for the why.
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { ADMIN_URL, TEST_DB_NAME, TEST_URL } from './test-db'

const MIGRATIONS_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../supabase/migrations',
)

// SQLSTATE for "database already exists" — Postgres has no IF NOT EXISTS for CREATE DATABASE.
const DUPLICATE_DATABASE = '42P04'

async function ensureTestDatabase(): Promise<void> {
  const admin = postgres(ADMIN_URL, { prepare: false, max: 1 })
  try {
    await admin.unsafe(`CREATE DATABASE "${TEST_DB_NAME}"`)
  } catch (err) {
    if ((err as { code?: string }).code !== DUPLICATE_DATABASE) throw err
  } finally {
    await admin.end({ timeout: 5 })
  }
}

async function applyMigrations(): Promise<void> {
  const sql = postgres(TEST_URL, { prepare: false, max: 1 })
  try {
    await sql.unsafe(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY);
      CREATE SCHEMA IF NOT EXISTS extensions;
      CREATE TABLE IF NOT EXISTS public._test_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    const appliedRows = await sql<
      { filename: string }[]
    >`SELECT filename FROM public._test_migrations`
    const applied = new Set(appliedRows.map((r) => r.filename))

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (applied.has(file)) continue
      const body = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
      try {
        await sql.unsafe(body)
        await sql`INSERT INTO public._test_migrations (filename) VALUES (${file})`
      } catch (err) {
        throw new Error(`integration-setup: migration ${file} failed: ${(err as Error).message}`)
      }
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

export async function setup(): Promise<void> {
  await ensureTestDatabase()
  await applyMigrations()
}
