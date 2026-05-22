---
paths:
  - "**/*.test.ts"
  - "**/*.integration.test.ts"
  - "src/test/**"
  - "vitest.config.mts"
---

# Testing

## Verification Loop

Three verification tiers, automatic → on-demand:

1. **Stop hook (automatic)** — runs `tsc --noEmit && biome check . && vitest run --project unit` after every task.
2. **Integration tests (explicit)** — `npm run test:integration`. Run when changing queries, migrations, or auth logic. Requires `supabase start`.
3. **Chrome DevTools (explicit)** — screenshot via chrome-devtools MCP after `npm run dev`. Use for components, layouts, styles.

## Integration Testing

Integration tests run against **local Supabase**, in the `integration` Vitest project (`vitest.config.mts`):

```bash
npm run test:integration
npx vitest run --project integration src/lib/some-module.integration.test.ts  # single file
```

- **File naming**: `*.integration.test.ts`, co-located with the module under test.
- **No mocking**: call real production functions.
- **Factories**: `createTestUser`, etc. from `src/test/factories.ts`.
- **`cleanTestData()`**: truncates all rows in FK-safe order; refuses to run unless `DATABASE_URL` points at a `_test`-suffixed DB.

## Test Database Isolation

Tests use a separate `postgres_test` database (same Supabase cluster), auto-created and migrated by Vitest `globalSetup` in `src/test/integration-setup.ts`. To reset:

```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DROP DATABASE IF EXISTS postgres_test;"
```

**Tests that prove behaviour**: test transformations, branching, failure paths, idempotency — not the literal call shape.
