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
  -h, --help              Show this help message
EOF
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────────────────

APP_NAME=""
APP_TITLE=""
DEST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --title) APP_TITLE="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
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

# CLAUDE.md — first line
sed -i '' "1s/App Template/${APP_TITLE}/" CLAUDE.md

# .env.local from example
cp .env.example .env.local

# ── Init git ─────────────────────────────────────────────────────────────────

git init -q
git add -A
git commit -q -m "Initial commit from app-template"

# ── Install ──────────────────────────────────────────────────────────────────

echo "Installing dependencies..."
npm install --silent

# ── Seed admin user ──────────────────────────────────────────────────────────

echo ""
echo "Setting up local Supabase and seeding admin user..."

supabase start

npm run db:push:local --silent

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
