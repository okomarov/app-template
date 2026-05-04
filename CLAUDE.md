# CLAUDE.md — App Template

## Project Overview

Next.js application built from the shared app template. Uses Supabase (shared instance, schema-per-app isolation) with Kysely query builder.

## Current Plan

If `docs/todo.md` exists, check it at the start of each session to pick up where we left off.

## Tech Stack

- **Frontend**: Next.js (App Router), React 19, TypeScript (strict)
- **Backend**: Supabase (shared instance, schema-per-app isolation), Kysely query builder
- **UI**: Base UI (`@base-ui/react`) wrappers in `src/components/ui/`, CSS modules
- **Data fetching**: TanStack Query (useQuery/useMutation)
- **Validation**: Zod at boundaries
- **Forms**: react-hook-form + @hookform/resolvers (Zod)
- **Icons**: lucide-react
- **Dates**: dayjs
- **Testing**: Vitest (co-located `*.test.ts` files)
- **Linting**: Biome (lint + format)
- **Deploy**: Vercel with Speed Insights + Analytics
- **Auth**: Supabase Auth with @supabase/ssr proxy pattern
- **Env vars**: @t3-oss/env-nextjs with Zod validation (src/env.ts)

## Database Architecture

### Schema-Per-App Isolation

This app uses its own Postgres schema within the shared Supabase instance. The schema name is set by the `DB_SCHEMA` env var.

- **App tables**: All live in the app schema (e.g., `app.users`, `app.contacts`)
- **`public` schema**: Reserved for Supabase internals and extensions. Never create app tables here.
- **`auth` schema**: Managed by Supabase Auth. The app's `users` table references `auth.users` via a `guid` FK.
- **Kysely `search_path`**: Set to `$DB_SCHEMA,public` via the postgres connection options. All unqualified table names resolve to the app schema.

### Migrations

**Supabase CLI** for migrations. **Kysely** for queries only (no schema management).

#### Workflow

1. Write the migration SQL by hand in `supabase/migrations/<timestamp>_<name>.sql`
2. All DDL should reference the app schema (qualified names or set `search_path` at top)
3. Apply to local: `supabase db push --local`
4. Verify with `supabase db diff --local` (no output = in sync)

#### Rules

- **Never use `supabase db diff -f`** to generate migrations — it replays all migrations into a shadow DB (slow) and picks up pre-existing drift.
- **Migrations must be idempotent** — use `IF EXISTS`, `IF NOT EXISTS`, or helper functions.

### Index & Constraint Naming Convention

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

### Timestamp Columns

All `created_at` and `updated_at` columns use `TIMESTAMPTZ`. Every table with `updated_at` must have the auto-update trigger:

```sql
CREATE TRIGGER {table}_updated_at
  BEFORE UPDATE ON app.{table}
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
```

### Type Generation

Run `npm run db:types` to regenerate `src/db/types.ts` from the live schema. This feeds Kysely's type system. **Regenerate after every migration.**

## Development Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run lint             # Biome check (lint + format check)
npm run lint:fix         # Biome auto-fix
npm run format           # Biome format
npx tsc --noEmit         # TypeScript check
npm run test:run         # Vitest (unit + integration)

# Database (Supabase CLI)
supabase db push --local          # Apply pending migrations to local
supabase db diff --local          # Verify local matches migrations
npm run db:types                  # Regenerate Kysely types from schema
npm run db:push:staging           # Apply migrations to staging
npm run db:push:prod              # Apply migrations to prod (user-only)
```

### Verification Loop

Three tiers, from automatic to on-demand:

1. **Stop hook (automatic)** — runs `tsc --noEmit && biome check . && vitest run --project unit` after every task. Catches type errors, lint issues, and broken logic.
2. **Integration tests (explicit)** — `npm run test:integration`. Run when changing queries, migrations, or auth logic. Requires local Supabase (`supabase start`).
3. **Chrome DevTools (explicit)** — screenshot via chrome-devtools MCP after `npm run dev`. Run when changing components, layouts, or styles to verify visual correctness.

### Integration Testing

Integration tests run against **local Supabase** (`supabase start` required). Defined as the `integration` project in `vitest.config.mts`.

```bash
npm run test:integration
npx vitest run --project integration src/lib/some-module.integration.test.ts  # single file
```

- **File naming**: `*.integration.test.ts`, co-located with the module under test.
- **No mocking**: Call real production functions, not stubs.
- **Factories**: `createTestUser`, etc. from `src/test/factories.ts`.
- **`cleanTestData()`**: Truncates all rows in FK-safe order. **Refuses to run unless `DATABASE_URL` points at a database whose name ends in `_test`** — guard against accidentally wiping the dev DB.

### Test database isolation

Integration tests run against a separate `postgres_test` database in the same Supabase Postgres cluster, never the dev `postgres` database. Set up automatically:

- Vitest `globalSetup` (`src/test/integration-setup.ts`) creates `postgres_test` if missing on every `npm run test:integration` invocation.
- The setup stubs `auth.users` (so the bootstrap migration's FK resolves) and the `extensions` schema, then applies every `supabase/migrations/*.sql` in order.
- Applied migration filenames are tracked in `public._test_migrations` so non-idempotent statements (e.g. `CREATE TRIGGER` without `DROP IF EXISTS`) only run once. Mirrors `supabase db push`.
- The integration project's `DATABASE_URL` env hardcodes `…/postgres_test`. `cleanTestData()` additionally asserts the connection target ends in `_test` as defence in depth.

When you add a new migration, it's picked up automatically on the next test run. To start from scratch, drop and recreate the test DB: `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DROP DATABASE IF EXISTS postgres_test;"`.

## Key Directories

```
src/
  app/
    actions/          # Server actions (thin wrappers over lib/ functions)
    api/              # API routes (webhooks, cron)
    (app)/            # Authenticated app routes
    (auth)/           # Auth pages (login, reset-password, mfa)
  components/
    ui/               # Base UI wrappers (Button, Flex, Text, Heading, TextField, Card)
    common/           # Shared UI (Header, MFA enrollment)
    [feature]/        # Feature-specific components
  db/
    index.ts          # Kysely client (main pool + auth pool)
    types.ts          # Generated Kysely Database interface
  hooks/              # Custom React hooks (useQuery/useMutation wrappers)
  lib/
    auth/             # Auth helpers (requireAuth, verifyCron)
    supabase/         # Supabase clients (browser, server, admin, proxy)
    constants/        # Shared constants and enum values
    schemas/          # Shared Zod schemas (promote here when reused)
    utils/            # Shared utility functions (promote here when reused)
    [feature]/        # Domain logic (queries, operations, schemas, utils)
  styles/
    tokens.css        # Design tokens (spacing, font sizes, radii, shadows, colors)
    globals.css       # Global styles
  test/               # Test helpers, factories, stubs
  env.ts              # @t3-oss/env-nextjs typed env vars
  proxy.ts            # Next.js proxy (Supabase session)
supabase/migrations/  # Hand-written SQL migration files
```

## Coding Style & Principles

- **Build only what is used**: No speculative endpoints, utilities, or full CRUD sets.
- **Co-locate until reused**: Types and constants live in the feature directory (`src/lib/[feature]/`) that owns them. Only promote to a shared location (`src/lib/constants/`, etc.) when a second consumer appears.
- **Validate every boundary first (Zod)**: All external input at entry. Infer types from schemas (`z.infer`).
- **Validate JSONB columns with `pg_jsonschema`**: Add `CHECK` constraints in migration SQL.
- **Type safety without bypasses**: No `any`, non-null assertions, or unsafe casts.
- **Thin server actions, reusable domain logic**: Server actions are orchestration-only. Core logic in `src/lib/`.
- **Error returns**: Server actions return `{ error: 'message' }` for expected failures, throw for unexpected.
- **Data integrity first**: No silent drops/skips. Use transactions for multi-table writes.
- **Idempotent writes by default**: DB constraints + `onConflict` for replayable inserts.
- **Constants and enums**: Constants: `UPPER_SNAKE_CASE`. Enum values: ALL_CAPS.
- **Early return over deep nesting**: Guard clauses at the top.
- **Comments**: Comment non-obvious intent/constraints ("why"), not literal code behavior.
- **Tests that prove behavior**: Test transformations, branching, failure paths, idempotency.

## Naming & Patterns

### File Naming

All source files use **kebab-case**: `application-card.tsx`, `use-current-user.ts`, `search-filters.module.css`. Single-word files are lowercase: `button.tsx`, `card.tsx`. Exported React components keep PascalCase symbol names (`export function ApplicationCard`) — only the filename is kebab-case. Exceptions: `CLAUDE.md`, `README.md`, and any other established convention from third-party tooling (e.g. Next.js layout/page filenames are already kebab-case).

### Function Naming

| Prefix            | Use Case                          | Returns                   | Example                          |
| ----------------- | --------------------------------- | ------------------------- | -------------------------------- |
| `get<Entity>`     | Deterministic filter (by ID)      | `Entity \| undefined`     | `getJob(jobId)`                  |
| `list<Entities>`  | Deterministic filter              | `Entity[]` (may be empty) | `listJobsByProject(id)`          |
| `find<Entity>`    | Inexact/fuzzy, at most one        | `Entity \| undefined`     | `findUserByEmail(email)`         |
| `find<Entities>`  | Fuzzy/user-input search           | `Entity[]`                | `findCompaniesBySector('AI')`    |
| `fetch<Entity>`   | External API call                 | `Entity` (throws)         | `fetchCompanyById(id)`           |
| `fetch<Entities>` | External API call                 | `Entity[]` (throws)       | `fetchPeopleByCollection(id)`    |

### Kysely Query Patterns

Use context7 (`kysely`) for query builder API reference. Follow existing patterns in `src/lib/` and `src/app/actions/`.

### Data Fetching (TanStack Query)

Use context7 (`@tanstack/react-query`) for hooks API reference. Follow existing patterns in `src/hooks/`.

Query key hierarchy: `['entity', 'variant', filters]`.

## UI & Styling

### Included Components

- **`Button`** — Full reference implementation with variants (solid/soft/outline/ghost/surface), colors, sizes, loading state
- **`Flex`** — Layout primitive with spacing/alignment props mapped to design tokens
- **`Text`** — Typography with size/color/weight props
- **`Heading`** — Semantic heading tags (h1-h6) auto-mapped from size
- **`TextField`** — Input wrapper with compound Root + Slot pattern
- **`Card`** — Container with surface/classic/ghost variants

### Creating New Base UI Wrappers

When you need a new component (Dialog, Select, DropdownMenu, Tabs, etc.):

1. **Check Base UI docs**: use context7 (`@base-ui/react`) for component API reference
2. **Create the wrapper** in `src/components/ui/{name}.tsx` — wrap Base UI primitives with custom styling
3. **Create the CSS module** in `src/components/ui/{name}.module.css` — use BEM-like naming (`.trigger`, `.popup`, `.item`)
4. **Use compound component pattern**: Export as `Component.Root`, `Component.Trigger`, `Component.Content`, etc.
5. **Export from barrel** in `src/components/ui/index.ts`
6. **Reference existing Button** (`button.tsx` + `button.module.css`) for the established patterns:
   - CSS custom properties for color variants (e.g., `--btn-9`, `--btn-11`)
   - Size classes with design token values
   - Transition timing conventions
   - Focus ring styling

### Styling Rules

- **CSS modules are the only source of truth for styles.** Never use inline `style={{}}` for static styles. Inline `style` is only acceptable for truly dynamic values computed at runtime.
- **Component layout props on `Flex`/`Text`** (like `gap`, `direction`, `align`) are acceptable since they're structural, but visual styling must live in CSS modules.
- **Don't duplicate**: if a component accepts a prop that controls a CSS property, don't also set it in a CSS class on the same element.
- **Design tokens** live in `src/styles/tokens.css`. Reference via `var(--space-N)`, `var(--font-size-N)`, etc.
- **BEM-like CSS module naming**: `.button`, `.variant-solid`, `.color-blue`, `.size-2`

## Cron / Background Jobs

### Vercel Cron

Define cron routes in `vercel.json` and `src/app/api/cron/[job]/route.ts`. Every cron handler starts with:

```typescript
export async function GET(request: Request) {
  const unauthorized = verifyCronSecret(request)
  if (unauthorized) return unauthorized
  // ... job logic
}
```

### Supabase pg_cron

For DB-level scheduled jobs, use `pg_cron` via a migration:

```sql
SELECT cron.schedule(
  'cleanup-stale-sessions',
  '0 * * * *',
  $$DELETE FROM app.sessions WHERE expires_at < now() - interval '1 day'$$
);
```

## Gotchas

- **Never re-export types from `'use server'` files**: Turbopack resolves `export type { X }` as runtime values.
- **`pg_jsonschema` nullable fields**: `jsonb_build_object` from nullable SQL columns produces explicit `null`. JSON schema must use `"type": ["string", "null"]`.
- **Kysely column references are unqualified by default**: In subqueries, explicitly qualify column names.
- **`prepare: false`**: Required when connecting through Supabase's transaction pooler.
- **Prod write PreToolUse hook**: A Bash hook blocks Claude-initiated write/DDL SQL against production. Don't retry — provide the SQL for the user to run manually.
