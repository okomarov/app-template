#!/bin/bash
# Guard against write operations on production database.
# Blocks Bash commands and Supabase MCP execute_sql targeting prod with write/DDL SQL.
# Read-only queries (SELECT) are allowed through.
#
# SETUP: Replace PROD_DB_ID with your Supabase production project ID.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

PROD_DB_ID="REPLACE_WITH_PROD_PROJECT_ID"
WRITE_SQL='\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b'

block() {
  jq -n --arg reason "$1" '{decision:"block",reason:$reason}'
  exit 0
}

case "$TOOL" in
  Bash)
    CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    [ -z "$CMD" ] && exit 0

    if ! echo "$CMD" | grep -qE '\.env\.production|'"$PROD_DB_ID"; then
      exit 0
    fi

    if echo "$CMD" | grep -qEi "$WRITE_SQL"; then
      block "Blocked: write/DDL SQL targeting production. Run manually if intentional."
    fi

    if echo "$CMD" | grep -qEi 'supabase db (push|reset)'; then
      block "Blocked: supabase migration command targeting production."
    fi
    ;;

  mcp__supabase__execute_sql|mcp__plugin_supabase_supabase__execute_sql)
    PROJECT=$(echo "$INPUT" | jq -r '.tool_input.project_id // empty')
    QUERY=$(echo "$INPUT" | jq -r '.tool_input.query // empty')

    if [ "$PROJECT" = "$PROD_DB_ID" ] && echo "$QUERY" | grep -qEi "$WRITE_SQL"; then
      block "Blocked: write/DDL SQL targeting production Supabase project."
    fi
    ;;
esac

exit 0
