#!/usr/bin/env sh
# init-prod.sh — Run production database migrations then start the Next.js server.
# Usage: sh scripts/init-prod.sh
set -e

echo "[init-prod] Running Prisma migrations..."
npx prisma migrate deploy

echo "[init-prod] Starting Next.js production server..."
exec npm start
