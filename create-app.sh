#!/bin/bash
set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Prompts ──────────────────────────────────────────────────────────────────

read -rp "App name (kebab-case, e.g. my-cool-app): " APP_NAME
if [[ -z "$APP_NAME" ]]; then
  echo "Error: app name is required." >&2
  exit 1
fi

read -rp "DB schema name [${APP_NAME//-/_}]: " DB_SCHEMA
DB_SCHEMA="${DB_SCHEMA:-${APP_NAME//-/_}}"

read -rp "App title for <title> tag [${APP_NAME}]: " APP_TITLE
APP_TITLE="${APP_TITLE:-${APP_NAME}}"

read -rp "Destination directory [../${APP_NAME}]: " DEST
DEST="${DEST:-$(dirname "$TEMPLATE_DIR")/${APP_NAME}}"

# ── Copy template ────────────────────────────────────────────────────────────

if [[ -d "$DEST" ]]; then
  echo "Error: ${DEST} already exists." >&2
  exit 1
fi

echo "Copying template to ${DEST}..."
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

echo "Customizing for ${APP_NAME}..."

# package.json — name
sed -i '' "s/\"name\": \"app-template\"/\"name\": \"${APP_NAME}\"/" package.json

# supabase/config.toml — project id + schema
sed -i '' "s/^id = \"app-template\"/id = \"${APP_NAME}\"/" supabase/config.toml
sed -i '' "s/schemas = \[\"app\",/schemas = [\"${DB_SCHEMA}\",/" supabase/config.toml

# .env.example — schema
sed -i '' "s/^DB_SCHEMA=app$/DB_SCHEMA=${DB_SCHEMA}/" .env.example

# init migration — schema name (replace schema-qualified "app." and standalone "app")
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

echo ""
echo "Done! Next steps:"
echo "  cd ${DEST}"
echo "  # Update .env.local with your Supabase credentials"
echo "  # Update .claude/hooks/guard-prod.sh with your prod project ID"
echo "  supabase start"
echo "  npm run db:push:local"
echo "  npm run db:types:local"
echo "  npm run dev"
