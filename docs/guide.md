# Guide

Detailed documentation for apps created from the template. For quick start, see the [README](../README.md).

## Working with Claude

Agent guidance is split across two locations:

- `CLAUDE.md` at the repo root — slim manifest, loads automatically at session start. Covers universal style, naming, commits, and orientation.
- `.claude/rules/*.md` — domain-specific rules with a `paths:` frontmatter. Each rule loads on demand only when Claude touches a file matching its globs (e.g. `migrations.md` loads when editing `supabase/migrations/**`).

To extend agent guidance, add a new file under `.claude/rules/` with the appropriate `paths:` glob. When the project outgrows a single app, see [scale-to-monorepo.md](scale-to-monorepo.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Database | Supabase (shared instance, schema-per-app), Kysely query builder |
| Auth | Supabase Auth with TOTP MFA, `@supabase/ssr` session proxy |
| UI | Base UI (`@base-ui/react`) wrappers, CSS modules, design tokens |
| Data fetching | TanStack Query |
| Validation | Zod at boundaries |
| Forms | react-hook-form + `@hookform/resolvers` |
| Icons | lucide-react |
| Testing | Vitest (unit + integration) |
| Linting | Biome (lint + format) |
| Deploy | Vercel with Speed Insights + Analytics |

## Project Structure

```
src/
  app/
    actions/            Server actions (thin wrappers over lib/ functions)
    api/                API routes (webhooks, cron)
    (app)/              Authenticated app routes
    (auth)/             Auth pages (login, forgot/reset password, MFA)
  components/
    ui/                 Base UI wrappers (Button, Flex, Text, Heading, TextField, Card)
    common/             Shared UI (Header, MFA enrollment)
  db/
    index.ts            Kysely client (main pool + auth pool)
    types.ts            Generated database types
  hooks/                TanStack Query hooks
  lib/
    auth/               Auth helpers (requireAuth, verifyCron)
    supabase/           Supabase clients (browser, server, admin, proxy)
    constants/          Shared constants
    schemas/            Shared Zod schemas
    utils/              Shared utilities
  styles/
    tokens.css          Design tokens (spacing, colors, typography)
    globals.css         Global styles
  test/                 Test helpers and factories
  env.ts                Typed env var validation
  proxy.ts              Next.js middleware (session management)
supabase/
  config.toml           Local Supabase config
  migrations/           Hand-written SQL migrations
```

## Database

### Schema-per-app isolation

All apps share a single Supabase instance but are isolated by Postgres schema. The schema name is set by the `DB_SCHEMA` env var and the Kysely `search_path` is configured to `$DB_SCHEMA,public`, so unqualified table names resolve to the app schema.

### Writing migrations

```bash
npm run db:new <migration_name>
```

Creates a timestamped SQL file in `supabase/migrations/`. Write DDL by hand, referencing the app schema:

```sql
CREATE TABLE app.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON app.contacts
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
```

Then apply and regenerate types:

```bash
npm run db:push:local
npm run db:types:local
```

### Migration rules

- Migrations must be **idempotent** (use `IF EXISTS`, `IF NOT EXISTS`)
- Never use `supabase db diff -f` to generate migrations
- All tables with `updated_at` need the `set_updated_at()` trigger
- Regenerate Kysely types after every migration

## Authentication

The template includes a complete auth flow:

- **Login** — Email/password with MFA branching
- **Password reset** — Forgot password + reset with token validation
- **MFA** — TOTP enrollment and verification (auto-submit at 6 digits)
- **Session proxy** — Middleware refreshes Supabase sessions via cookies
- **Auth guard** — `requireAuth()` validates JWT, checks user status, enforces MFA

Protected routes live in `src/app/(app)/`. The middleware redirects unauthenticated users to `/login`.

## UI Components

Base UI wrappers with CSS modules and design tokens:

| Component | Description |
|-----------|-------------|
| `Button` | Variants: solid, soft, outline, ghost, surface. Colors, sizes, loading state |
| `Flex` | Layout primitive with spacing and alignment props |
| `Text` | Typography with size, color, and weight props |
| `Heading` | Semantic h1-h6, auto-mapped from size |
| `TextField` | Input with compound Root + Slot pattern |
| `Card` | Container with surface, classic, ghost variants |

Import from `@/components/ui`:

```tsx
import { Button, Flex, Text, Heading, TextField, Card } from '@/components/ui'
```

Design tokens are defined in `src/styles/tokens.css` and referenced as CSS custom properties (`var(--space-4)`, `var(--font-size-2)`, etc.).

## Development Commands

```bash
npm run dev                # Dev server
npm run build              # Production build
npm run check              # TypeScript + Biome validation
npm run lint               # Biome check (lint + format)
npm run lint:fix           # Biome auto-fix
npm run test:run           # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests (requires local Supabase)
```

### Database

```bash
npm run db:new <name>       # Create a new migration file
npm run db:push:local       # Apply migrations to local Supabase
npm run db:types:local      # Regenerate Kysely types from local schema
npm run db:types            # Regenerate Kysely types from remote schema
npm run db:push:staging     # Apply migrations to staging
npm run db:push:prod        # Apply migrations to production
```

## Adding a Feature

A typical feature involves:

1. **Migration** — `npm run db:new`, write SQL, push, regenerate types
2. **Domain logic** — `src/lib/<feature>/` with queries and business logic
3. **Server actions** — `src/app/actions/<feature>.ts` as thin wrappers
4. **Hooks** — `src/hooks/use-<feature>.ts` with TanStack Query
5. **Components** — `src/components/<feature>/` for UI
6. **Route** — `src/app/(app)/<feature>/page.tsx`

Co-locate types, constants, and schemas in the feature directory. Only promote to shared locations (`src/lib/constants/`, `src/lib/schemas/`) when a second consumer appears.

## Deployment

Deployed on Vercel. The `vercel.json` configures:

- **Regions**: `lhr1`, `dub1`
- **Cron jobs**: Routes matching `/src/app/api/cron/**/*.ts` with 300s max duration

Cron handlers must verify the secret:

```typescript
import { verifyCronSecret } from '@/lib/auth/verify-cron'

export async function GET(request: Request) {
  const unauthorized = verifyCronSecret(request)
  if (unauthorized) return unauthorized
  // job logic
}
```

### Hosted Supabase URL configuration

The Supabase Auth allow-list governs every email flow — confirmation, magic links, OAuth callbacks, password reset. The redirect URLs in `supabase/config.toml` only affect local Supabase; the hosted project must be configured in the dashboard at **Auth → URL Configuration**.

**Site URL**: the production URL, e.g. `https://my-app.vercel.app`.

**Redirect URLs** (add one per row):

- `https://<prod-host>/**` — production
- `http://localhost:3000/**` — local dev against the hosted project
- `https://<project>-*.vercel.app/**` — Vercel preview deploys (optional, broad — allow-lists every current and future preview)

Wildcard syntax: `**` matches any path including slashes; `*` matches a single path segment. The trailing `/**` is what lets auth callback paths match.

### Hosted Supabase email templates

The signup and password-recovery flows use Supabase's [SSR PKCE pattern](https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr): the email link points at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…&next=…` and our `/auth/confirm` route exchanges the token via `verifyOtp`. This requires custom email templates — Supabase's defaults use `{{ .ConfirmationURL }}` (the implicit/legacy flow) and won't work with `/auth/confirm`.

The templates in `supabase/templates/*.html` are wired up via `supabase/config.toml` for local Supabase. **`supabase db push` does NOT upload email templates to hosted projects** — they must be installed once per hosted environment.

Install on each hosted environment (staging, prod):

1. Open the Supabase Dashboard → **Authentication → Email Templates**.
2. For each template, paste the contents of the matching file:
   - **Confirm signup** ← `supabase/templates/confirmation.html`
   - **Reset password** ← `supabase/templates/recovery.html`
3. Set the subject lines to match `supabase/config.toml` (`Confirm your account`, `Reset your password`).
4. Save.

Verify by triggering a signup or password-reset on the hosted environment and inspecting the email — the link should point at `/auth/confirm?token_hash=…`, not `/auth/v1/verify?token=…`.

### Seeding the first admin user

The app has no public signup — rows in `app.users` are only created by the local bootstrap script or by the `createUser` admin action (which requires an existing admin). After deploying, the first user signed up via the Supabase dashboard will have an `auth.users` row but no app-level row, and `requireAuth()` will throw `AuthError('NO_APP_USER')`.

Bootstrap the first admin once in the hosted SQL editor:

```sql
INSERT INTO app.users (guid, name, email, is_admin)
SELECT id, 'Admin', email, true
FROM auth.users
WHERE email = '<your-email>';
```

Subsequent users can be invited from inside the app via the admin UI.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `SUPABASE_PROJECT_ID` | Supabase project ID (for type generation) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SCHEMA` | App schema name |
| `CRON_SECRET` | Bearer token for Vercel cron jobs |
