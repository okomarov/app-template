#!/bin/bash
set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Usage ───────────────────────────────────────────────────────────────────

usage() {
  cat <<EOF
Usage: ./create-app.sh <app-name> [options]

Create a new app from the template.

Arguments:
  app-name                Kebab-case name (e.g. my-cool-app)

Options:
  --title <title>         App title for <title> tag (default: Title Case of app name)
  --dest <path>           Destination directory (default: ../<app-name>)
  --monorepo              Scaffold as a Turborepo monorepo (apps/<name>/, workspaces).
                          Default is a flat single-app layout.
  --skip-deps             Skip npm install, supabase start, and admin seeding (for testing).
  -h, --help              Show this help message
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────────────────

APP_NAME=""
APP_TITLE=""
DEST=""
MONOREPO="false"
SKIP_DEPS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --title) APP_TITLE="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
    --monorepo) MONOREPO="true"; shift ;;
    --skip-deps) SKIP_DEPS="true"; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) APP_NAME="$1"; shift ;;
  esac
done

if [[ -z "$APP_NAME" ]]; then
  echo "Error: app name is required." >&2
  echo "Run './create-app.sh --help' for usage." >&2
  exit 1
fi

# ── Defaults ────────────────────────────────────────────────────────────────

DB_SCHEMA="${APP_NAME//-/_}"

if [[ -z "$APP_TITLE" ]]; then
  APP_TITLE=$(echo "$APP_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')
fi

DEST="${DEST:-$(dirname "$TEMPLATE_DIR")/${APP_NAME}}"

# ── Copy template ────────────────────────────────────────────────────────────

if [[ -d "$DEST" ]]; then
  echo "Error: ${DEST} already exists." >&2
  exit 1
fi

echo "Creating ${APP_NAME} in ${DEST}..."
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude .vercel \
  --exclude .env.local \
  --exclude .env.production \
  --exclude tsbuildinfo \
  --exclude .git \
  --exclude .claude/settings.local.json \
  --exclude create-app.sh \
  "$TEMPLATE_DIR/" "$DEST/"

cd "$DEST"

# ── Replacements ─────────────────────────────────────────────────────────────

# package.json — name
sed -i '' "s/\"name\": \"app-template\"/\"name\": \"${APP_NAME}\"/" package.json

# supabase/config.toml — project id + schema
sed -i '' "s/^project_id = \"app-template\"/project_id = \"${APP_NAME}\"/" supabase/config.toml
sed -i '' "s/schemas = \[\"app\",/schemas = [\"${DB_SCHEMA}\",/" supabase/config.toml

# .env.example — schema
sed -i '' "s/^DB_SCHEMA=app$/DB_SCHEMA=${DB_SCHEMA}/" .env.example

# init migration — schema name
for f in supabase/migrations/*.sql; do
  sed -i '' -e "s/[[:<:]]app[[:>:]]/${DB_SCHEMA}/g" "$f"
done

# layout.tsx — title + description
sed -i '' "s/title: 'App'/title: '${APP_TITLE}'/" src/app/layout.tsx
sed -i '' "s/description: 'App description'/description: '${APP_TITLE}'/" src/app/layout.tsx

# src/**/*.tsx — "App Name" wordmark in auth pages and header
find src -name "*.tsx" -exec sed -i '' "s/App Name/${APP_TITLE}/g" {} +

# CLAUDE.md — first line
sed -i '' "1s/App Template/${APP_TITLE}/" CLAUDE.md

# ── Monorepo wrap (optional) ─────────────────────────────────────────────────

if [[ "$MONOREPO" == "true" ]]; then
  echo "Wrapping into Turborepo monorepo layout..."

  APP_DIR="apps/${APP_NAME}"
  mkdir -p "$APP_DIR"

  # Move app-scoped files into apps/<name>/.
  # Stays at repo root: CLAUDE.md (monorepo manifest), .claude/ (rules + hooks),
  # supabase/ (one shared instance), biome.json (tree-wide lint config),
  # .git/ (just initialised by parent flow), apps/ (newly created).
  shopt -s dotglob nullglob
  for item in *; do
    case "$item" in
      CLAUDE.md|.claude|supabase|biome.json|.git|apps) continue ;;
      *) mv "$item" "$APP_DIR/" ;;
    esac
  done
  shopt -u dotglob nullglob

  # Root package.json — npm workspaces + Turborepo entry points
  cat > package.json <<EOF
{
  "name": "${APP_NAME}",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "lint:fix": "biome check --fix .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:integration": "turbo run test:integration",
    "db:new": "supabase migration new",
    "db:push:local": "supabase db push --local",
    "db:push:staging": "supabase db push",
    "db:types:local": "npm run db:types:local --workspace=${APP_NAME}-app"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
EOF

  # Turborepo pipeline
  cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:integration": {
      "dependsOn": ["^build"]
    }
  }
}
EOF

  # Shared TS config (the app's tsconfig.json extends this)
  cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true
  }
}
EOF

  # Point the app's tsconfig at the shared base (keeps next plugin + jsx + paths local)
  sed -i '' '1a\
  "extends": "../../tsconfig.base.json",
' "$APP_DIR/tsconfig.json"

  # Rename the app's package.json "name" to a workspace-scoped one
  sed -i '' "s/\"name\": \"${APP_NAME}\"/\"name\": \"${APP_NAME}-app\"/" "$APP_DIR/package.json"

  # Tell Next.js to transpile any future workspace packages (placeholder list, harmless when empty)
  if [[ -f "$APP_DIR/next.config.ts" ]]; then
    # No-op for now — packages/ will be added on first extraction; this is a marker.
    :
  fi

  # Rewrite .claude/rules/ globs to the monorepo paths
  RULES_DIR=".claude/rules"
  if [[ -d "$RULES_DIR" ]]; then
    # db.md — Kysely client moves to packages/db when extracted; src/lib spans any future app
    sed -i '' \
      -e 's|"src/db/\*\*"|"packages/db/**"|' \
      -e 's|"src/lib/\*\*/\*\.ts"|"apps/*/src/lib/**/*.ts"|' \
      "$RULES_DIR/db.md"

    # ui.md
    sed -i '' \
      -e "s|\"src/components/\\*\\*\"|\"apps/${APP_NAME}/src/components/**\"|" \
      -e "s|\"src/hooks/\\*\\*\"|\"apps/${APP_NAME}/src/hooks/**\"|" \
      -e "s|\"\\*\\*/\\*\\.module\\.css\"|\"apps/${APP_NAME}/**/*.module.css\"|" \
      "$RULES_DIR/ui.md"

    # server-actions.md
    sed -i '' \
      -e "s|\"src/app/actions/\\*\\*\"|\"apps/${APP_NAME}/src/app/actions/**\"|" \
      "$RULES_DIR/server-actions.md"

    # testing.md — broaden across apps for future expansion
    sed -i '' \
      -e 's|"\*\*/\*\.test\.ts"|"apps/*/src/**/*.test.ts"|' \
      -e 's|"\*\*/\*\.integration\.test\.ts"|"apps/*/src/**/*.integration.test.ts"|' \
      -e 's|"src/test/\*\*"|"apps/*/src/test/**"|' \
      -e 's|"vitest\.config\.mts"|"apps/*/vitest.config.mts"|' \
      "$RULES_DIR/testing.md"

    # cron.md
    sed -i '' \
      -e "s|\"src/app/api/cron/\\*\\*\"|\"apps/${APP_NAME}/src/app/api/cron/**\"|" \
      -e "s|\"vercel\\.json\"|\"apps/${APP_NAME}/vercel.json\"|" \
      "$RULES_DIR/cron.md"
  fi

  # Patch root CLAUDE.md: insert Workspace layout section + rewrite Path-Scoped Rules manifest
  python3 - "$APP_NAME" "$DB_SCHEMA" <<'PY'
import sys, pathlib, re

app_name, db_schema = sys.argv[1], sys.argv[2]
path = pathlib.Path("CLAUDE.md")
text = path.read_text()

workspace_section = f"""## Workspace Layout

```
./
├── apps/
│   └── {app_name}/              Next.js app (schema: {db_schema})
├── packages/                    (empty — extract shared code here when a second consumer appears)
├── supabase/
│   ├── config.toml              project_id = "{app_name}"
│   └── migrations/              Hand-written SQL, schema-qualified to {db_schema}
├── package.json                 npm workspaces root
├── turbo.json                   Turborepo task pipeline
├── tsconfig.base.json           Shared TS config (apps extend)
├── biome.json                   Single Biome config for the tree
└── .env.local                   Shared env (DATABASE_URL, NEXT_PUBLIC_*, etc.)
```

"""

# Insert Workspace Layout before Tech Stack
text = text.replace("## Tech Stack\n", workspace_section + "## Tech Stack\n", 1)

# Rewrite the Path-Scoped Rules manifest globs
replacements = {
    "(`src/db/**`, `src/lib/**/*.ts`)": "(`packages/db/**`, `apps/*/src/lib/**/*.ts`)",
    "(`src/components/**`, `src/hooks/**`, `*.module.css`)":
        f"(`apps/{app_name}/src/components/**`, `apps/{app_name}/src/hooks/**`, `apps/{app_name}/**/*.module.css`)",
    "(`src/app/actions/**`)": f"(`apps/{app_name}/src/app/actions/**`)",
    "(`src/app/api/cron/**`, `vercel.json`)":
        f"(`apps/{app_name}/src/app/api/cron/**`, `apps/{app_name}/vercel.json`)",
    "(`**/*.test.ts`, `src/test/**`)": "(`apps/*/src/**/*.test.ts`, `apps/*/src/test/**`)",
}
for old, new in replacements.items():
    text = text.replace(old, new)

# Adjust development commands to be workspace-aware
text = re.sub(
    r"```bash\nnpm run dev\s+# Next\.js dev server\n",
    f"```bash\nnpm run dev                              # turbo run dev across all workspaces\nnpm run dev --workspace={app_name}-app   # dev server for the Next app only\n",
    text, count=1,
)
text = re.sub(
    r"npx tsc --noEmit\s+# TypeScript check\n",
    "npm run typecheck                        # turbo run typecheck across workspaces\n",
    text, count=1,
)
text = re.sub(
    r"npm run test:run\s+# Vitest \(unit \+ integration\)\n",
    "npm run test                             # turbo run test across workspaces\nnpm run test:integration                 # turbo run test:integration across workspaces\n",
    text, count=1,
)

path.write_text(text)
PY

  # .env handling — root holds the actual file; app symlinks to it
  if [[ -f "$APP_DIR/.env.example" ]]; then
    cp "$APP_DIR/.env.example" .env.local
    ln -sf "../../.env.local" "$APP_DIR/.env.local"
  fi

  # Patch the Stop hook so verification runs against the monorepo (not flat) layout.
  # tsc/vitest need workspace dispatch; biome stays root-wide via the kept biome.json.
  sed -i '' \
    "s|npx tsc --noEmit && npx biome check \\. && npx vitest run --project unit|npm run typecheck \\&\\& npx biome check . \\&\\& npm run test|" \
    .claude/settings.json
else
  # Flat layout — .env.local sits next to .env.example
  cp .env.example .env.local
fi

# ── Init git ─────────────────────────────────────────────────────────────────

git init -q
git add -A
git commit -q -m "Initial commit from app-template"

# ── Install ──────────────────────────────────────────────────────────────────

if [[ "$SKIP_DEPS" == "true" ]]; then
  echo ""
  echo "Skipping npm install and Supabase bootstrap (--skip-deps)."
  echo ""
  echo "Done! Created ${APP_NAME} in ${DEST}"
  exit 0
fi

echo "Installing dependencies..."
npm install --silent

# ── Seed admin user ──────────────────────────────────────────────────────────

echo ""
echo "Setting up local Supabase and seeding admin user..."

supabase start

if [[ "$MONOREPO" == "true" ]]; then
  (cd "apps/${APP_NAME}" && npm run db:push:local --silent)
else
  npm run db:push:local --silent
fi

ADMIN_EMAIL="admin@${APP_NAME}.local"
ADMIN_PASSWORD=$(openssl rand -base64 16)

SUPABASE_URL="http://127.0.0.1:54321"
SERVICE_ROLE_KEY=$(supabase status --output json | grep -o '"SERVICE_ROLE_KEY":"[^"]*"' | cut -d'"' -f4)

# Create auth user
AUTH_RESPONSE=$(curl -s "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASSWORD}\", \"email_confirm\": true}")

AUTH_UID=$(echo "$AUTH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -z "$AUTH_UID" ]]; then
  echo "Warning: failed to create admin user. You can create one manually later." >&2
  echo "$AUTH_RESPONSE" >&2
else
  # Insert into app users table
  psql -q "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    -c "INSERT INTO ${DB_SCHEMA}.users (guid, name, email, is_admin) VALUES ('${AUTH_UID}', 'Admin', '${ADMIN_EMAIL}', true);"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "Done! Created ${APP_NAME} in ${DEST}"
echo ""
echo "  cd ${DEST}"
echo "  npm run dev"

if [[ -n "$AUTH_UID" ]]; then
  echo ""
  echo "  Admin login:"
  echo "    Email:    ${ADMIN_EMAIL}"
  echo "    Password: ${ADMIN_PASSWORD}"
fi

echo ""
echo "  # Update .claude/hooks/guard-prod.sh with your prod project ID"
