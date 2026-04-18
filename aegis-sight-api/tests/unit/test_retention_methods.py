"""Unit tests for RetentionService methods (Issue #441).

Tests cover cleanup_old_logs, cleanup_old_snapshots, archive_audit_logs,
and get_retention_stats using an AsyncMock session — no real database.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.services.retention_service import BATCH_SIZE, RetentionService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_execute_result(rowcount: int = 0, scalar_val=None, scalar_one_val=None, scalars_val=None):
    """Return a MagicMock mimicking SQLAlchemy CursorResult."""
    result = MagicMock()
    result.rowcount = rowcount
    result.scalar = MagicMock(return_value=scalar_val)
    result.scalar_one = MagicMock(return_value=scalar_one_val)
    if scalars_val is not None:
        result.scalars.return_value.all.return_value = scalars_val
    return result


def _make_db(*execute_results):
    """Return an AsyncMock AsyncSession returning the given execute results in order."""
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=list(execute_results))
    db.flush = AsyncMock()
    return db


# ---------------------------------------------------------------------------
# cleanup_old_logs
# ---------------------------------------------------------------------------


class TestCleanupOldLogs:
    def test_returns_dict_with_required_keys(self) -> None:
        # One batch per table, all under BATCH_SIZE so loop exits immediately
        result_5 = _make_execute_result(rowcount=5)
        db = _make_db(result_5, result_5, result_5)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_logs())
        assert "cutoff" in result
        assert "retention_days" in result
        assert "deleted" in result

    def test_default_retention_days_in_result(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0, result_0, result_0)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_logs())
        assert result["retention_days"] == 1095

    def test_custom_retention_days_in_result(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0, result_0, result_0)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_logs(retention_days=365))
        assert result["retention_days"] == 365

    def test_deleted_counts_summed_per_table(self) -> None:
        result_3 = _make_execute_result(rowcount=3)
        db = _make_db(result_3, result_3, result_3)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_logs())
        deleted = result["deleted"]
        # Three event tables: logon_events, usb_events, file_events
        assert len(deleted) == 3
        for v in deleted.values():
            assert v == 3

    def test_flush_called_once_per_table(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0, result_0, result_0)
        svc = RetentionService(db)
        asyncio.run(svc.cleanup_old_logs())
        assert db.flush.await_count == 3

    def test_multi_batch_loop(self) -> None:
        # First batch returns BATCH_SIZE → continues; second returns 0 → exits
        full = _make_execute_result(rowcount=BATCH_SIZE)
        empty = _make_execute_result(rowcount=0)
        # 3 tables × 2 batches = 6 execute calls
        db = _make_db(full, empty, full, empty, full, empty)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_logs())
        # Each table: BATCH_SIZE + 0 = BATCH_SIZE
        for v in result["deleted"].values():
            assert v == BATCH_SIZE


# ---------------------------------------------------------------------------
# cleanup_old_snapshots
# ---------------------------------------------------------------------------


class TestCleanupOldSnapshots:
    def test_returns_dict_with_required_keys(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_snapshots())
        assert "cutoff" in result
        assert "retention_days" in result
        assert "deleted" in result

    def test_deleted_hardware_snapshots_key(self) -> None:
        result_7 = _make_execute_result(rowcount=7)
        db = _make_db(result_7)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_snapshots())
        assert "hardware_snapshots" in result["deleted"]
        assert result["deleted"]["hardware_snapshots"] == 7

    def test_default_retention_days(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0)
        svc = RetentionService(db)
        result = asyncio.run(svc.cleanup_old_snapshots())
        assert result["retention_days"] == 365

    def test_flush_called_once_per_batch(self) -> None:
        result_0 = _make_execute_result(rowcount=0)
        db = _make_db(result_0)
        svc = RetentionService(db)
        asyncio.run(svc.cleanup_old_snapshots())
        db.flush.assert_awaited_once()


# ---------------------------------------------------------------------------
# archive_audit_logs — no archive table
# ---------------------------------------------------------------------------


class TestArchiveAuditLogsNoTable:
    def test_archive_table_exists_false(self) -> None:
        check_result = _make_execute_result(scalar_val=False)
        count_result = _make_execute_result(scalar_one_val=42)
        db = _make_db(check_result, count_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["archive_table_exists"] is False

    def test_eligible_rows_reported_when_no_table(self) -> None:
        check_result = _make_execute_result(scalar_val=False)
        count_result = _make_execute_result(scalar_one_val=42)
        db = _make_db(check_result, count_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["eligible_rows"] == 42

    def test_archived_and_deleted_zero_when_no_table(self) -> None:
        check_result = _make_execute_result(scalar_val=False)
        count_result = _make_execute_result(scalar_one_val=10)
        db = _make_db(check_result, count_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["archived"] == 0
        assert result["deleted"] == 0

    def test_returns_required_keys_when_no_table(self) -> None:
        check_result = _make_execute_result(scalar_val=False)
        count_result = _make_execute_result(scalar_one_val=0)
        db = _make_db(check_result, count_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        for key in ("cutoff", "older_than_days", "archive_table_exists", "eligible_rows", "archived", "deleted"):
            assert key in result


# ---------------------------------------------------------------------------
# archive_audit_logs — archive table exists, no rows
# ---------------------------------------------------------------------------


class TestArchiveAuditLogsWithTable:
    def test_archive_table_exists_true_no_rows(self) -> None:
        check_result = _make_execute_result(scalar_val=True)
        count_result = _make_execute_result(scalar_one_val=0)
        # batch_ids query returns empty list → loop exits immediately
        batch_result = _make_execute_result(scalars_val=[])
        db = _make_db(check_result, count_result, batch_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["archive_table_exists"] is True
        assert result["archived"] == 0
        assert result["deleted"] == 0

    def test_archived_count_reflects_rows_moved(self) -> None:
        check_result = _make_execute_result(scalar_val=True)
        count_result = _make_execute_result(scalar_one_val=3)
        # batch_ids: first call returns 3 IDs, insert result, delete result, second call empty
        batch_ids = [1, 2, 3]
        batch_result1 = _make_execute_result(scalars_val=batch_ids)
        insert_result = _make_execute_result()
        delete_result = _make_execute_result()
        batch_result2 = _make_execute_result(scalars_val=[])
        db = _make_db(check_result, count_result, batch_result1, insert_result, delete_result, batch_result2)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["archived"] == 3
        assert result["deleted"] == 3

    def test_default_older_than_days(self) -> None:
        check_result = _make_execute_result(scalar_val=False)
        count_result = _make_execute_result(scalar_one_val=0)
        db = _make_db(check_result, count_result)
        svc = RetentionService(db)
        result = asyncio.run(svc.archive_audit_logs())
        assert result["older_than_days"] == 1095


# ---------------------------------------------------------------------------
# get_retention_stats
# ---------------------------------------------------------------------------


class TestGetRetentionStats:
    def _make_stats_db(self):
        """Return a db mock that returns count=10, size='16 kB', oldest=None for each table."""
        from datetime import UTC, datetime
        oldest_dt = datetime(2024, 1, 1, tzinfo=UTC)
        results = []
        for _ in range(5):  # 5 tables
            count_res = _make_execute_result(scalar_one_val=10)
            size_res = _make_execute_result(scalar_one_val="16 kB")
            oldest_res = _make_execute_result(scalar_one_val=oldest_dt)
            results.extend([count_res, size_res, oldest_res])
        return _make_db(*results)

    def test_returns_tables_key(self) -> None:
        db = self._make_stats_db()
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        assert "tables" in result

    def test_five_tables_in_stats(self) -> None:
        db = self._make_stats_db()
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        assert len(result["tables"]) == 5

    def test_table_entry_keys(self) -> None:
        db = self._make_stats_db()
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        for entry in result["tables"]:
            assert "table" in entry
            assert "row_count" in entry
            assert "size" in entry
            assert "oldest_record" in entry

    def test_table_names_present(self) -> None:
        db = self._make_stats_db()
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        names = {e["table"] for e in result["tables"]}
        assert names == {"logon_events", "usb_events", "file_events", "hardware_snapshots", "audit_logs"}

    def test_oldest_record_isoformat(self) -> None:
        db = self._make_stats_db()
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        for entry in result["tables"]:
            # oldest_record should be a string (ISO format) or None
            assert entry["oldest_record"] is None or isinstance(entry["oldest_record"], str)

    def test_oldest_none_when_no_rows(self) -> None:
        results = []
        for _ in range(5):
            count_res = _make_execute_result(scalar_one_val=0)
            size_res = _make_execute_result(scalar_one_val="8 kB")
            oldest_res = _make_execute_result(scalar_one_val=None)
            results.extend([count_res, size_res, oldest_res])
        db = _make_db(*results)
        svc = RetentionService(db)
        result = asyncio.run(svc.get_retention_stats())
        for entry in result["tables"]:
            assert entry["oldest_record"] is None
