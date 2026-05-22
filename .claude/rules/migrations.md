---
paths:
  - "supabase/migrations/**"
---

# Migrations

**Supabase CLI** for migrations. **Kysely** for queries only (no schema management).

## Workflow

1. Write the migration SQL by hand in `supabase/migrations/<timestamp>_<name>.sql`
2. All DDL should reference the app schema (qualified names or set `search_path` at top)
3. Apply to local: `supabase db push --local`
4. Verify with `supabase db diff --local` (no output = in sync)
5. Regenerate types: `npm run db:types`

## Rules

- **Never use `supabase db diff -f`** to generate migrations — it replays all migrations into a shadow DB (slow) and picks up pre-existing drift.
- **Migrations must be idempotent** — use `IF EXISTS`, `IF NOT EXISTS`, or helper functions.
- **Functions pin `search_path`** — `SET search_path = ''` in every `CREATE FUNCTION` (Supabase lint 0011).
- **Extensions go in `extensions`, not `public`** — `CREATE EXTENSION ... SCHEMA extensions` (Supabase lint 0014).
- **Validate JSONB columns with `pg_jsonschema`** — add `CHECK` constraints in migration SQL. Note: `jsonb_build_object` from nullable SQL columns produces explicit `null`, so JSON schema must use `"type": ["string", "null"]`.
- **Enumerated columns use Postgres ENUMs**, not `TEXT + CHECK (col IN (...))`. ENUMs are visible to `kysely-codegen` as string-literal unions; `TEXT + CHECK` is not.
  ```sql
  DO $$ BEGIN
    CREATE TYPE app.scrape_status AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  ```
  - Add values: `ALTER TYPE … ADD VALUE`. Rename/remove: column-swap migration (rename column → new column with new enum → backfill → drop renamed column).
  - `CHECK` constraints stay right for range checks (`age BETWEEN 0 AND 150`), cross-column conditions (`end_at > start_at`), and JSONB shape validation via `pg_jsonschema`.
- **Prod write PreToolUse hook blocks Claude-initiated write/DDL SQL against production.** Don't retry — provide the SQL for the user to run manually.

## Index & Constraint Naming

Pattern: `{table}_{columns}_{modifiers}_{suffix}`, all `snake_case`, under 63 characters.

| Object | Suffix | Example |
|--------|--------|---------|
| Primary key | `_pkey` | `contacts_pkey` |
| Unique constraint | `_key` | `contacts_email_key` |
| Foreign key | `_fkey` | `orders_user_id_fkey` |
| B-tree index | `_idx` | `contacts_status_idx` |
| GIN index | `_gin` | `contacts_bio_gin` |
| Check constraint | `_check` | `users_age_check` |

**Modifiers** (before suffix): `_desc` (descending), `_p` (partial WHERE).

Multi-column: join in index order — `list_contacts_list_id_status_updated_at_idx`.

## Timestamp Columns

All `created_at` and `updated_at` columns use `TIMESTAMPTZ`. Every table with `updated_at` must have the auto-update trigger:

```sql
CREATE TRIGGER {table}_updated_at
  BEFORE UPDATE ON app.{table}
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
```

## Supabase pg_cron

For DB-level scheduled jobs, use `pg_cron` via a migration:

```sql
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 * * * *',
  $$DELETE FROM app.sessions WHERE expires_at < now() - interval '1 day'$$
);
```
