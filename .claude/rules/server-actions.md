---
paths:
  - "src/app/actions/**"
---

# Server Actions

- **Thin server actions, reusable domain logic**: Server actions are orchestration-only. Core logic in `src/lib/`.
- **Error returns**: Server actions return `{ error: 'message' }` for expected failures, throw for unexpected.
- **Gotcha — never re-export types from `'use server'` files**: Turbopack resolves `export type { X }` as runtime values.
