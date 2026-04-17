"""
Data retention policy service.

Handles cleanup of expired log data, hardware snapshots, and audit log
archival according to configurable retention periods.  All destructive
operations are executed in batches to avoid long-running transactions and
excessive lock contention.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, UTC

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.hardware_snapshot import HardwareSnapshot
from app.models.log_event import FileEvent, LogonEvent, UsbEvent

logger = logging.getLogger(__name__)

# Default batch size for all bulk operations
BATCH_SIZE = 1000


class RetentionService:
    """Implements data retention policies with batch processing."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------------
    # cleanup_old_logs
    # ------------------------------------------------------------------
    async def cleanup_old_logs(self, retention_days: int = 1095) -> dict:
        """Delete log events older than *retention_days* (default 3 years).

        Affected tables: logon_events, usb_events, file_events.
        Returns a summary with the number of deleted rows per table.
        """
        cutoff = datetime.now(UTC) - timedelta(days=retention_days)
        summary: dict[str, int] = {}

        for model, ts_col in [
            (LogonEvent, LogonEvent.occurred_at),
            (UsbEvent, UsbEvent.occurred_at),
            (FileEvent, FileEvent.occurred_at),
        ]:
            total_deleted = 0
            while True:
                # Select IDs in batches to limit transaction size
                subq = (
                    select(model.id)
                    .where(ts_col < cutoff)
                    .limit(BATCH_SIZE)
                )
                stmt = delete(model).where(model.id.in_(subq))
                result = await self.db.execute(stmt)
                await self.db.flush()
                deleted = result.rowcount
                total_deleted += deleted
                if deleted < BATCH_SIZE:
                    break

            table_name = model.__tablename__
            summary[table_name] = total_deleted
            logger.info(
                "Retention cleanup: deleted %d rows from %s (cutoff=%s)",
                total_deleted,
                table_name,
                cutoff.isoformat(),
            )

        return {
            "cutoff": cutoff.isoformat(),
            "retention_days": retention_days,
            "deleted": summary,
        }

    # ------------------------------------------------------------------
    # cleanup_old_snapshots
    # ------------------------------------------------------------------
    async def cleanup_old_snapshots(self, retention_days: int = 365) -> dict:
        """Delete hardware snapshots older than *retention_days* (default 1 year)."""
        cutoff = datetime.now(UTC) - timedelta(days=retention_days)
        total_deleted = 0

        while True:
            subq = (
                select(HardwareSnapshot.id)
                .where(HardwareSnapshot.snapped_at < cutoff)
                .limit(BATCH_SIZE)
            )
            stmt = delete(HardwareSnapshot).where(HardwareSnapshot.id.in_(subq))
            result = await self.db.execute(stmt)
            await self.db.flush()
            deleted = result.rowcount
            total_deleted += deleted
            if deleted < BATCH_SIZE:
                break

        logger.info(
            "Retention cleanup: deleted %d hardware_snapshots (cutoff=%s)",
            total_deleted,
            cutoff.isoformat(),
        )

        return {
            "cutoff": cutoff.isoformat(),
            "retention_days": retention_days,
            "deleted": {"hardware_snapshots": total_deleted},
        }

    # ------------------------------------------------------------------
    # archive_audit_logs
    # ------------------------------------------------------------------
    async def archive_audit_logs(self, older_than_days: int = 1095) -> dict:
        """Archive audit log entries older than *older_than_days*.

        Archival is implemented as an INSERT-INTO-SELECT into an
        ``audit_logs_archive`` table (if it exists), followed by deletion
        from the live table.  If the archive table does not yet exist the
        method only reports the number of rows that *would* be archived
        without deleting anything -- this is a safe no-op.

        NOTE: The audit_log model is append-only by design.  Archival is
        the *only* sanctioned deletion path and must itself be audited by
        the caller.
        """
        cutoff = datetime.now(UTC) - timedelta(days=older_than_days)

        # Check whether the archive table already exists
        check = await self.db.execute(
            text(
                "SELECT EXISTS ("
                "  SELECT 1 FROM information_schema.tables "
                "  WHERE table_name = 'audit_logs_archive'"
                ")"
            )
        )
        archive_exists = check.scalar()

        # Count candidate rows
        count_stmt = (
            select(func.count())
            .select_from(AuditLog)
            .where(AuditLog.created_at < cutoff)
        )
        count_result = await self.db.execute(count_stmt)
        candidate_count = count_result.scalar_one()

        if not archive_exists:
            logger.warning(
                "audit_logs_archive table does not exist -- "
                "reporting %d rows eligible for archival without deleting",
                candidate_count,
            )
            return {
                "cutoff": cutoff.isoformat(),
                "older_than_days": older_than_days,
                "archive_table_exists": False,
                "eligible_rows": candidate_count,
                "archived": 0,
                "deleted": 0,
            }

        # Archive + delete in batches
        total_archived = 0
        while True:
            batch_ids_stmt = (
                select(AuditLog.id)
                .where(AuditLog.created_at < cutoff)
                .limit(BATCH_SIZE)
            )
            batch_ids = (await self.db.execute(batch_ids_stmt)).scalars().all()
            if not batch_ids:
                break

            # Copy to archive
            await self.db.execute(
                text(
                    "INSERT INTO audit_logs_archive "
                    "SELECT * FROM audit_logs WHERE id = ANY(:ids)"
                ),
                {"ids": list(batch_ids)},
            )

            # Delete originals
            stmt = delete(AuditLog).where(AuditLog.id.in_(batch_ids))
            await self.db.execute(stmt)
            await self.db.flush()
            total_archived += len(batch_ids)

            if len(batch_ids) < BATCH_SIZE:
                break

        logger.info(
            "Audit log archival: archived and deleted %d rows (cutoff=%s)",
            total_archived,
            cutoff.isoformat(),
        )

        return {
            "cutoff": cutoff.isoformat(),
            "older_than_days": older_than_days,
            "archive_table_exists": True,
            "eligible_rows": candidate_count,
            "archived": total_archived,
            "deleted": total_archived,
        }

    # ------------------------------------------------------------------
    # get_retention_stats
    # ------------------------------------------------------------------
    async def get_retention_stats(self) -> dict:
        """Return per-table row counts and estimated sizes.

        Uses ``pg_total_relation_size`` for size and ``reltuples`` for
        fast approximate counts, falling back to exact counts for small
        tables.
        """
        tables = [
            "logon_events",
            "usb_events",
            "file_events",
            "hardware_snapshots",
            "audit_logs",
        ]

        stats: list[dict] = []
        for table in tables:
            # Exact count (acceptable for reporting)
            row_count_result = await self.db.execute(
                text(f"SELECT COUNT(*) FROM {table}")
            )
            row_count = row_count_result.scalar_one()

            # Table size (including indexes + TOAST)
            size_result = await self.db.execute(
                text(
                    "SELECT pg_size_pretty(pg_total_relation_size(:tbl))"
                ),
                {"tbl": table},
            )
            size_pretty = size_result.scalar_one()

            # Oldest record timestamp
            ts_col = {
                "logon_events": "occurred_at",
                "usb_events": "occurred_at",
                "file_events": "occurred_at",
                "hardware_snapshots": "snapped_at",
                "audit_logs": "created_at",
            }[table]

            oldest_result = await self.db.execute(
                text(f"SELECT MIN({ts_col}) FROM {table}")
            )
            oldest = oldest_result.scalar_one()

            stats.append(
                {
                    "table": table,
                    "row_count": row_count,
                    "size": size_pretty,
                    "oldest_record": oldest.isoformat() if oldest else None,
                }
            )

        return {"tables": stats}
