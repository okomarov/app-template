# Scale to monorepo

How to lift an app built from this template into a Turborepo monorepo when a second app or a shared package appears. Anchored on the planning-applications migration — that's the worked example referenced throughout.

## Two paths

**Bootstrap path** (you know up front you want a monorepo): pass `--monorepo` to `create-app.sh`. The script scaffolds the Turborepo layout in one shot — `apps/<name>/` wrapping, root `package.json` workspaces, `turbo.json`, `tsconfig.base.json`, prefixed rule globs, Workspace Layout section in CLAUDE.md, `.env.local` symlinked from the app. Skip the rest of this doc — you're done.

**Migration path** (existing flat app that has outgrown a single surface): the recipe below. It describes the same end state the bootstrap flag produces, but as manual steps so you can apply them to an app already in production.

## When to scale

You're past a flat single-app layout when one of these is true:

- A **second app** lands (another Next.js surface, a Cloudflare Worker, a mobile target).
- A **package needs to be shared** across two consumers (e.g. the Kysely client + types used by both a Next app and a Worker).

Don't pre-scale. A flat layout is cheaper to navigate, build, and reason about; the upgrade is mechanical when you actually need it.

## What changes structurally

```
<repo>/
├── apps/
│   ├── <next-app>/         (previous flat repo's src/, supabase config consumer)
│   └── <other-app>/        (worker, second Next app, etc.)
├── packages/
│   └── <shared-pkg>/       (e.g. @<scope>/db — Kysely client + Database type)
├── supabase/
│   ├── config.toml         project_id at the repo root, one shared Supabase project
│   └── migrations/         all schemas' migrations in one timestamp-ordered directory
├── package.json            npm workspaces root
├── turbo.json              Turborepo pipeline
├── tsconfig.base.json      shared TS config, each package extends
├── biome.json              single Biome config for the whole tree
└── .env.local              shared env; apps symlink to it
```

Concrete diffs from a flat template:

- **npm workspaces + Turborepo** at the root (`workspaces: ["apps/*", "packages/*"]`, `turbo.json` pipeline).
- **Schema-per-product** in the shared Supabase instance. Where flat used `app`, monorepo uses one schema per product (e.g. `planning_applications`, plus whatever a future second product owns). Migrations stay in a single `supabase/migrations/` at the repo root, each DDL statement qualified with its product's schema.
- **`packages/db`** owns the Kysely client and the `Database` type. Every app imports from `@<scope>/db`. Apps no longer carry `src/db/`.
- **`transpilePackages: ['@<scope>/db']`** in each Next app's `next.config.ts` — Next won't bundle workspace packages otherwise.
- **`.env.local` at repo root**, symlinked from each app (`apps/<app>/.env.local → ../../.env.local`). Supabase CLI scripts at root source it directly.
- **Wrangler** (if any app is a Cloudflare Worker) must run from inside that app's directory — it resolves `wrangler.toml` from `cwd`.

## Rules layout transformation

All rules stay in **one** `.claude/rules/` at the repo root. No nested rules under `apps/*`.

| Flat rule | Monorepo rule | Glob change |
|-----------|---------------|-------------|
| `migrations.md` (`supabase/migrations/**`) | unchanged path | content: schema name swap; note multiple product schemas; fold in pg_cron |
| `db.md` (`src/db/**`, `src/lib/**/*.ts`) | (`packages/db/**`, `apps/*/src/lib/**/*.ts`) | add `transpilePackages` gotcha; note whether types are auto-generated (codegen) or hand-maintained |
| `ui.md` (`src/components/**`, `src/hooks/**`, `*.module.css`) | (`apps/<next-app>/src/components/**`, `apps/<next-app>/src/hooks/**`, `apps/<next-app>/**/*.module.css`) | prefix with app path |
| `server-actions.md` (`src/app/actions/**`) | (`apps/<next-app>/src/app/actions/**`) | prefix with app path |
| `testing.md` (`**/*.test.ts`, `src/test/**`) | (`apps/*/src/**/*.test.ts`, `apps/*/src/**/*.integration.test.ts`, `apps/*/src/test/**`, `apps/*/vitest.config.mts`) | broaden to span apps |
| `cron.md` (`src/app/api/cron/**`, `vercel.json`) | keep if any app uses Vercel cron; drop if no app uses it. CF Worker cron lives in the worker's rule, not here |

New rules that may appear:

- **`<worker-app>.md`** (`apps/<worker-app>/**`) — only when an app has a fundamentally different runtime (Cloudflare Workers, mobile, etc.). Captures Durable Objects, wrangler-from-app-dir gotcha, the non-Kysely DB client, cron triggers, secrets storage. Distil from that app's institutional knowledge; don't smear into the generic rules.
- **`<app-name>.md`** (`apps/<app-name>/**`) — only when an app has institutional knowledge that doesn't generalise (auth pattern, admin pagination conventions, domain dictionaries, etc.). This is the path-scoped equivalent of a nested per-app CLAUDE.md, with the same load behaviour and the benefit of staying indexed in one place.

Both are app-specific glob targets, not multi-app artefacts — a second Next app following the template's conventions needs zero new rules.

## Slim root CLAUDE.md changes

Compared to the flat template's CLAUDE.md, the monorepo version adds one section and extends two:

- **Add: Workspace layout** — a top-level tree showing `apps/`, `packages/`, `supabase/`. Names the products and their schemas.
- **Extend: Tech stack** — adds entries only for what's actually new (e.g. Cloudflare Workers + `postgres.js` if a worker landed).
- **Extend: Path-scoped rules manifest** — adds any new rule files and corrects globs to the prefixed forms.
- **Extend: Development commands** — per-app workspace commands (`npm run dev --workspace=@<scope>/<app>`). Note any commands that must run from inside an app dir (e.g. wrangler).
- **Extend: Cross-cutting gotchas** — anything that genuinely spans the tree (`.env.local` symlink pattern, Biome's tree-wide config, Vitest `--project` resolving from the app dir not the root).

Everything else — universal principles, naming rules, function-naming table, commit conventions — ports unchanged.

## What does not change

Roughly 85% of rule content ports verbatim from the flat template:

- Style/principles section in the root CLAUDE.md.
- File-naming and function-naming rules.
- Conventional Commits guidance.
- Server-action patterns (thin actions, error returns, `'use server'` re-export gotcha).
- UI rules (Base UI vs native primitives, CSS modules, design tokens).
- Testing rules (verification loop, integration testing, `postgres_test` isolation).
- Migration rules (DDL idempotency, ENUMs, naming, `search_path = ''`).

If you find yourself rewriting one of these from scratch during a migration, stop and copy from the flat template.

## Verification

After the migration, before merging:

1. **Static glob check** — for each rule, grep the tree for files matching its globs. Confirm each rule matches the files you intended, nothing surprising, and root-level files (`package.json`, `turbo.json`, `biome.json`, `README.md`) match no rule.
2. **Runtime probe** — temporarily install an `InstructionsLoaded` hook that logs each fired rule + `trigger_file_path`. In a fresh session inside the monorepo, Read one file per rule's intended glob and one root file expected to match nothing. Verify the log matches expectations. Remove the hook.
3. **Smell test** — pick a recent real task and ask whether the right rules would have fired. If a task needed a rule that didn't fire (or fired a rule that didn't apply), the globs are wrong.

## Worked example

`planning-applications` is the live reference: 2 apps (Next.js + Cloudflare Worker), 2 packages (`db`, `document-extracts`), one shared Supabase project with two product schemas. Its `.claude/rules/` directory holds the seven files this guide describes — six of which are direct ports/extensions of the flat template's six rules, plus one worker-specific rule and one app-specific institutional rule.

Read its root `CLAUDE.md` and `.claude/rules/` side-by-side with this template's to see every concrete delta.
