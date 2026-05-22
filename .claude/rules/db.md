---
paths:
  - "src/db/**"
  - "src/lib/**/*.ts"
---

# Database access

## Schema-Per-App Isolation

This app uses its own Postgres schema within the shared Supabase instance. The schema name is set by the `DB_SCHEMA` env var.

- **App tables**: All live in the app schema (e.g., `app.users`, `app.contacts`)
- **`public` schema**: Reserved for Supabase internals and extensions. Never create app tables here.
- **`auth` schema**: Managed by Supabase Auth. The app's `users` table references `auth.users` via a `guid` FK.
- **Kysely `search_path`**: Set to `$DB_SCHEMA,public` via the postgres connection options. All unqualified table names resolve to the app schema.

## Patterns

- **Type generation**: Run `npm run db:types` to regenerate `src/db/types.ts` from the live schema. Regenerate after every migration.
- **Kysely query builder**: Use context7 (`kysely`) for API reference. Follow existing patterns in `src/lib/` and `src/app/actions/`.
- **Data integrity first**: No silent drops/skips. Use transactions for multi-table writes.
- **Idempotent writes by default**: DB constraints + `onConflict` for replayable inserts.

## Gotchas

- **Kysely column references are unqualified by default**: In subqueries, explicitly qualify column names.
- **`prepare: false`**: Required when connecting through Supabase's transaction pooler.
