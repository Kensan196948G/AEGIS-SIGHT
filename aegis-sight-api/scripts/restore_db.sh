#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# AEGIS-SIGHT PostgreSQL Restore Script
#
# Usage:
#   ./restore_db.sh <backup_file.sql.gz>
#
# Environment variables (with defaults):
#   PGHOST        - PostgreSQL host     (default: localhost)
#   PGPORT        - PostgreSQL port     (default: 5432)
#   PGUSER        - PostgreSQL user     (default: aegis)
#   PGDATABASE    - database name       (default: aegis_sight)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---- Configuration -------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-aegis}"
PGDATABASE="${PGDATABASE:-aegis_sight}"

LOG_FILE="/tmp/aegis_sight_restore_$(date +%Y%m%d_%H%M%S).log"

# ---- Helpers -------------------------------------------------------------
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

die() {
    log "ERROR: $*"
    exit 1
}

# ---- Argument check ------------------------------------------------------
if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    die "Backup file not found: ${BACKUP_FILE}"
fi

# ---- Confirmation prompt -------------------------------------------------
echo ""
echo "=========================================="
echo "  AEGIS-SIGHT Database Restore"
echo "=========================================="
echo ""
echo "  Host:     ${PGHOST}:${PGPORT}"
echo "  Database: ${PGDATABASE}"
echo "  User:     ${PGUSER}"
echo "  File:     ${BACKUP_FILE}"
echo "  Log:      ${LOG_FILE}"
echo ""
echo "  WARNING: This will DROP and RECREATE the"
echo "  database. All existing data will be lost."
echo ""
read -rp "  Type 'yes' to proceed: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# ---- Restore -------------------------------------------------------------
log "Starting restore of ${PGDATABASE} from ${BACKUP_FILE}"

# Drop and recreate the database
log "Dropping and recreating database ${PGDATABASE}..."
psql \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="postgres" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" \
    2>>"$LOG_FILE" || true

psql \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="postgres" \
    -c "DROP DATABASE IF EXISTS ${PGDATABASE};" \
    -c "CREATE DATABASE ${PGDATABASE};" \
    2>>"$LOG_FILE" \
  || die "Failed to recreate database"

log "Database recreated. Restoring from backup..."

# Decompress and restore
gunzip -c "$BACKUP_FILE" \
  | psql \
      --host="$PGHOST" \
      --port="$PGPORT" \
      --username="$PGUSER" \
      --dbname="$PGDATABASE" \
      --set ON_ERROR_STOP=off \
      2>>"$LOG_FILE" \
  || die "Restore failed -- check ${LOG_FILE} for details"

log "Restore completed successfully"
echo ""
echo "Restore finished. Log: ${LOG_FILE}"
