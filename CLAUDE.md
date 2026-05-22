# CLAUDE.md — App Template

Next.js application built from the shared app template.

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

## Path-Scoped Rules

Domain guidance lives in `.claude/rules/*.md` and loads only when Claude touches matching files:

- `migrations.md` — DDL, naming, ENUMs, timestamps, pg_cron (`supabase/migrations/**`)
- `db.md` — schema isolation, Kysely patterns, type generation (`src/db/**`, `src/lib/**/*.ts`)
- `ui.md` — Base UI wrappers, styling, data-fetching hooks (`src/components/**`, `src/hooks/**`, `*.module.css`)
- `server-actions.md` — orchestration, error returns (`src/app/actions/**`)
- `cron.md` — Vercel cron handler pattern (`src/app/api/cron/**`, `vercel.json`)
- `testing.md` — verification loop, integration tests (`**/*.test.ts`, `src/test/**`)

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

## Key Directories

```
src/
  app/
    actions/          # Server actions
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
    schemas/          # Shared Zod schemas
    utils/            # Shared utility functions
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
- **Co-locate until reused**: Types and constants live in the feature directory (`src/lib/[feature]/`) that owns them. Promote to a shared location only when a second consumer appears.
- **Explicit over implicit**: Minimise the reader's inference. The cost of writing it down is paid once; the cost of inferring is paid forever.
- **Validate every boundary first (Zod)**: All external input at entry. Infer types from schemas (`z.infer`).
- **Type safety without bypasses**: No `any`, non-null assertions, or unsafe casts.
- **Early return over deep nesting**: Guard clauses at the top.
- **Constants and enums**: Constants: `UPPER_SNAKE_CASE`. Enum values: `ALL_CAPS`.
- **Comments**: Comment non-obvious intent/constraints ("why"), not literal code behaviour.

## Naming

### File Naming

- Source files: kebab-case (`application-card.tsx`, `use-current-user.ts`, `search-filters.module.css`). Single-word: lowercase (`button.tsx`, `card.tsx`).
- React components keep PascalCase symbol names (`export function ApplicationCard`) — only filenames differ.
- Exceptions: `CLAUDE.md`, `README.md`, Next.js reserved filenames.

### Function Naming

| Prefix            | Use Case                          | Returns                   | Example                          |
| ----------------- | --------------------------------- | ------------------------- | -------------------------------- |
| `get<Entity>`     | Deterministic filter (by ID)      | `Entity \| undefined`     | `getJob(jobId)`                  |
| `list<Entities>`  | Deterministic filter              | `Entity[]` (may be empty) | `listJobsByProject(id)`          |
| `find<Entity>`    | Inexact/fuzzy, at most one        | `Entity \| undefined`     | `findUserByEmail(email)`         |
| `find<Entities>`  | Fuzzy/user-input search           | `Entity[]`                | `findCompaniesBySector('AI')`    |
| `fetch<Entity>`   | External API call                 | `Entity` (throws)         | `fetchCompanyById(id)`           |
| `fetch<Entities>` | External API call                 | `Entity[]` (throws)       | `fetchPeopleByCollection(id)`    |

## Commits

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<scope>)?: <summary>`, `!` for breaking.
- Only commit when explicitly asked. Don't auto-commit.
- Body explains the *why* — for `fix:` / `perf:`, the symptom and root cause; flag deliberate non-fixes as follow-ups.
- Large coherent commits are fine; itemise sub-changes in the body and mark which are behaviour-changing. Don't bundle unrelated drive-bys.
- `refactor:` only for zero-behaviour-change restructuring — anything observable is `feat:` / `fix:` / `perf:`.
- Footers: `Fixes: <hash>` for regressions, `Refs: #N` for issue/PR links.
