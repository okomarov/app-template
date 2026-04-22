import 'server-only'
import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import { env } from '@/env'
import type { Database } from './types'

const CONNECT_TIMEOUT_S = 10
const IDLE_TIMEOUT_S = 20
const MAX_LIFETIME_S = 60 * 30
const STATEMENT_TIMEOUT_MS = 30_000
const MAIN_POOL_SIZE = 4
const AUTH_POOL_SIZE = 1

function createClient(max: number) {
  return postgres(env.DATABASE_URL, {
    prepare: false,
    max,
    connect_timeout: CONNECT_TIMEOUT_S,
    idle_timeout: IDLE_TIMEOUT_S,
    max_lifetime: MAX_LIFETIME_S,
    connection: {
      statement_timeout: STATEMENT_TIMEOUT_MS,
      search_path: `${env.DB_SCHEMA},public`,
    },
  })
}

export const db = new Kysely<Database>({
  dialect: new PostgresJSDialect({ postgres: createClient(MAIN_POOL_SIZE) }),
})

// Dedicated pool so requireAuth never blocks on the main pool's connections
export const authDb = new Kysely<Database>({
  dialect: new PostgresJSDialect({ postgres: createClient(AUTH_POOL_SIZE) }),
})
