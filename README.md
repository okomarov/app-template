# App Template

Next.js + Supabase application template. All apps share a single Supabase instance and are isolated by Postgres schema.

## Usage

```bash
./create-app.sh <app-name> [--title "My App"] [--dest ./path]
```

| Argument | Description |
|----------|-------------|
| `app-name` | Kebab-case name, e.g. `my-cool-app` (required) |
| `--title` | App title for `<title>` tag (default: Title Case of app name) |
| `--dest` | Destination directory (default: `../<app-name>`) |

The script copies the template, customizes schema references, installs dependencies, starts local Supabase, runs migrations, and seeds an admin user with a random password.

```
$ ./create-app.sh my-cool-app

Creating my-cool-app in ../my-cool-app...
Installing dependencies...
Setting up local Supabase and seeding admin user...

Done! Created my-cool-app in ../my-cool-app

  cd ../my-cool-app
  npm run dev

  Admin login:
    Email:    admin@my-cool-app.local
    Password: <random>
```

## Prerequisites

- Node.js 24.x
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- Docker (for local Supabase)

## What's included

- Supabase Auth with email/password login, password reset, and TOTP MFA
- Kysely query builder with generated types and schema-per-app isolation
- Base UI component wrappers (Button, Flex, Text, Heading, TextField, Card)
- CSS modules with design tokens
- TanStack Query for data fetching
- Zod validation + react-hook-form
- Biome linting/formatting, Vitest testing
- Vercel deployment config with cron support

See [docs/guide.md](docs/guide.md) for detailed documentation.
