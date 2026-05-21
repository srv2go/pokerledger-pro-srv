#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   RENDER_DB_URL="postgres://..." NEON_DB_URL="postgres://...?sslmode=require" ./migrate-db-to-neon.sh

if [[ -z "${RENDER_DB_URL:-}" || -z "${NEON_DB_URL:-}" ]]; then
  echo "❌ Missing required environment variables."
  echo "Set RENDER_DB_URL and NEON_DB_URL, then rerun."
  exit 1
fi

TMP_DUMP="/tmp/pokerledger_migration_$(date +%s).dump"

echo "📦 Exporting Render database..."
pg_dump "$RENDER_DB_URL" --format=custom --no-owner --no-privileges --file="$TMP_DUMP"

echo "🧹 Resetting Neon schema..."
psql "$NEON_DB_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "📥 Importing into Neon..."
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$NEON_DB_URL" "$TMP_DUMP"

echo "🔧 Running Prisma migrations..."
DATABASE_URL="$NEON_DB_URL" npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "✅ Migration completed successfully"
rm -f "$TMP_DUMP"
