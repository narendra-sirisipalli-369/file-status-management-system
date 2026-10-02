#!/usr/bin/env bash
# =============================================================================
# backup_db.sh — INS Dega FSMS Database Backup Script (PostgreSQL)
# =============================================================================
# Creates a timestamped, gzip-compressed pg_dump of the production database
# and stores it in the /backups directory inside the project root.
#
# Requires DATABASE_URL to be set in the environment (postgresql://...).
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

PG_DUMP_FILE="${BACKUP_DIR}/fsms_backup_${TIMESTAMP}.sql.gz"
pg_dump "${DATABASE_URL}" | gzip > "${PG_DUMP_FILE}"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] PostgreSQL backup saved: ${PG_DUMP_FILE}"

# ── Retention policy: keep last 30 daily backups ──────────────────────────────
find "${BACKUP_DIR}" -maxdepth 1 -name 'fsms_backup_*.sql.gz' -mtime +30 -delete

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retention cleanup complete. Backups in: ${BACKUP_DIR}"
