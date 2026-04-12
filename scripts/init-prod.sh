#!/usr/bin/env sh
# init-prod.sh — Run production database migrations then start the Next.js server.
# Usage: sh scripts/init-prod.sh
set -e

echo "[init-prod] Running Prisma migrations..."
if echo "${DATABASE_URL:-}" | grep -q '^file:'; then
  echo "[init-prod] Detected SQLite; syncing schema with prisma db push..."
  npx prisma db push
else
  npx prisma migrate deploy
fi

echo "[init-prod] Starting Next.js production server..."
exec npm start
