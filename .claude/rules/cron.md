---
paths:
  - "src/app/api/cron/**"
  - "vercel.json"
---

# Vercel Cron

Define cron routes in `vercel.json` and `src/app/api/cron/[job]/route.ts`. Every cron handler starts with:

```typescript
export async function GET(request: Request) {
  const unauthorized = verifyCronSecret(request)
  if (unauthorized) return unauthorized
  // ... job logic
}
```
