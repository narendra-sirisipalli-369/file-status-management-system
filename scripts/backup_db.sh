#!/usr/bin/env bash
# =============================================================================
# backup_db.sh — INS Dega FSMS Database Backup Script
# =============================================================================
# Creates a timestamped copy of the production database and stores it in the
# /backups directory inside the project root.
#
# Usage:
#   bash scripts/backup_db.sh
#
# Cron job (daily at midnight, run as the application user):
#   0 0 * * * /path/to/project/scripts/backup_db.sh >> /var/log/fsms_backup.log 2>&1
#
# To install the cron entry, run:
#   (crontab -l 2>/dev/null; echo "0 0 * * * $(realpath "$0") >> /var/log/fsms_backup.log 2>&1") | crontab -
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

# Resolve the project root relative to this script's location so the script
# works regardless of the current working directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Timestamp used in the backup filename (e.g. 20260412_000000)
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Backup destination directory (created automatically if it does not exist)
BACKUP_DIR="${PROJECT_ROOT}/backups"

# ── SQLite backup (default provider: sqlite) ──────────────────────────────────

# Path to the production SQLite database.
# Adjust to prisma/dev.db for development or the path set in DATABASE_URL for
# a custom production location.
SQLITE_DB="${PROJECT_ROOT}/prisma/dev.db"

# ── PostgreSQL backup (alternative provider) ──────────────────────────────────
# If the application is configured with a PostgreSQL datasource, comment out
# the SQLite section above and uncomment the block below.  Set DATABASE_URL in
# the environment or replace the pg_dump connection string directly.
#
# PG_DUMP_FILE="${BACKUP_DIR}/fsms_backup_${TIMESTAMP}.sql.gz"
# pg_dump "${DATABASE_URL}" | gzip > "${PG_DUMP_FILE}"
# echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] PostgreSQL backup saved: ${PG_DUMP_FILE}"

# =============================================================================

# Create backup directory if it does not already exist
mkdir -p "${BACKUP_DIR}"

# ── Run SQLite backup ─────────────────────────────────────────────────────────

if [ ! -f "${SQLITE_DB}" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: Database file not found at ${SQLITE_DB}" >&2
  exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/fsms_backup_${TIMESTAMP}.db"

# Use SQLite's .backup command for a safe online hot-copy that avoids file
# corruption even when the application is writing to the database concurrently.
if command -v sqlite3 &> /dev/null; then
  sqlite3 "${SQLITE_DB}" ".backup '${BACKUP_FILE}'"
else
  # Fall back to a plain copy if sqlite3 CLI is not installed
  cp "${SQLITE_DB}" "${BACKUP_FILE}"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SQLite backup saved: ${BACKUP_FILE}"

# ── Retention policy: keep last 30 daily backups ──────────────────────────────
# Delete backups older than 30 days to prevent disk exhaustion.
find "${BACKUP_DIR}" -maxdepth 1 -name 'fsms_backup_*.db' -mtime +30 -delete
find "${BACKUP_DIR}" -maxdepth 1 -name 'fsms_backup_*.sql.gz' -mtime +30 -delete

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retention cleanup complete. Backups in: ${BACKUP_DIR}"
