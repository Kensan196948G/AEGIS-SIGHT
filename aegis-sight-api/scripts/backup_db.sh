#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# AEGIS-SIGHT PostgreSQL Backup Script
#
# Usage:
#   ./backup_db.sh
#   PGHOST=db.example.com PGPORT=5432 PGUSER=aegis PGDATABASE=aegis_sight ./backup_db.sh
#
# Environment variables (with defaults):
#   PGHOST        - PostgreSQL host          (default: localhost)
#   PGPORT        - PostgreSQL port          (default: 5432)
#   PGUSER        - PostgreSQL user          (default: aegis)
#   PGDATABASE    - database name            (default: aegis_sight)
#   BACKUP_DIR    - backup directory         (default: /var/backups/aegis-sight)
#   RETENTION_DAYS- days to keep old backups (default: 30)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---- Configuration -------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-aegis}"
PGDATABASE="${PGDATABASE:-aegis_sight}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aegis-sight}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

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

# ---- Main ----------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

log "Starting backup of ${PGDATABASE}@${PGHOST}:${PGPORT}"

# Run pg_dump with gzip compression
pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose 2>>"$LOG_FILE" \
  | gzip -9 > "$BACKUP_FILE" \
  || die "pg_dump failed"

FILESIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
log "Backup completed: ${BACKUP_FILE} (${FILESIZE})"

# ---- Cleanup old backups -------------------------------------------------
log "Removing backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
log "Deleted ${DELETED} old backup(s)"

log "Backup process finished successfully"
