"""Tests for the RetentionService data retention policies."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hardware_snapshot import HardwareSnapshot
from app.models.log_event import FileAction, FileEvent, LogonEvent, UsbAction, UsbEvent
from app.services.retention_service import RetentionService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _insert_logon_events(
    session: AsyncSession,
    device_id,
    count: int,
    occurred_at: datetime,
) -> None:
    """Insert *count* logon events with the given timestamp."""
    for i in range(count):
        event = LogonEvent(
            device_id=device_id,
            user_name=f"testuser_{i}",
            event_id=4624,
            occurred_at=occurred_at,
        )
        session.add(event)
    await session.flush()


async def _insert_usb_events(
    session: AsyncSession,
    device_id,
    count: int,
    occurred_at: datetime,
) -> None:
    for i in range(count):
        event = UsbEvent(
            device_id=device_id,
            device_name=f"USB Device {i}",
            action=UsbAction.connected,
            occurred_at=occurred_at,
        )
        session.add(event)
    await session.flush()


async def _insert_file_events(
    session: AsyncSession,
    device_id,
    count: int,
    occurred_at: datetime,
) -> None:
    for i in range(count):
        event = FileEvent(
            device_id=device_id,
            user_name=f"testuser_{i}",
            file_path=f"/tmp/test_{i}.txt",
            action=FileAction.create,
            occurred_at=occurred_at,
        )
        session.add(event)
    await session.flush()


async def _insert_hw_snapshots(
    session: AsyncSession,
    device_id,
    count: int,
    snapped_at: datetime,
) -> None:
    for i in range(count):
        snap = HardwareSnapshot(
            device_id=device_id,
            cpu_model="Intel i7",
            snapped_at=snapped_at,
        )
        session.add(snap)
    await session.flush()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCleanupOldLogs:
    """Tests for cleanup_old_logs."""

    async def test_deletes_old_logon_events(
        self, db_session: AsyncSession, sample_device
    ):
        old_date = datetime.now(timezone.utc) - timedelta(days=1100)
        recent_date = datetime.now(timezone.utc) - timedelta(days=10)

        await _insert_logon_events(db_session, sample_device.id, 3, old_date)
        await _insert_logon_events(db_session, sample_device.id, 2, recent_date)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_logs(retention_days=1095)

        assert result["deleted"]["logon_events"] == 3
        assert result["retention_days"] == 1095

        # Verify only recent rows remain
        remaining = await db_session.execute(select(LogonEvent))
        assert len(remaining.scalars().all()) == 2

    async def test_deletes_old_usb_events(
        self, db_session: AsyncSession, sample_device
    ):
        old_date = datetime.now(timezone.utc) - timedelta(days=1100)
        await _insert_usb_events(db_session, sample_device.id, 5, old_date)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_logs(retention_days=1095)

        assert result["deleted"]["usb_events"] == 5

    async def test_deletes_old_file_events(
        self, db_session: AsyncSession, sample_device
    ):
        old_date = datetime.now(timezone.utc) - timedelta(days=1100)
        await _insert_file_events(db_session, sample_device.id, 4, old_date)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_logs(retention_days=1095)

        assert result["deleted"]["file_events"] == 4

    async def test_no_deletion_when_all_recent(
        self, db_session: AsyncSession, sample_device
    ):
        recent = datetime.now(timezone.utc) - timedelta(days=10)
        await _insert_logon_events(db_session, sample_device.id, 3, recent)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_logs(retention_days=1095)

        assert result["deleted"]["logon_events"] == 0


@pytest.mark.asyncio
class TestCleanupOldSnapshots:
    """Tests for cleanup_old_snapshots."""

    async def test_deletes_old_snapshots(
        self, db_session: AsyncSession, sample_device
    ):
        old_date = datetime.now(timezone.utc) - timedelta(days=400)
        recent_date = datetime.now(timezone.utc) - timedelta(days=30)

        await _insert_hw_snapshots(db_session, sample_device.id, 3, old_date)
        await _insert_hw_snapshots(db_session, sample_device.id, 2, recent_date)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_snapshots(retention_days=365)

        assert result["deleted"]["hardware_snapshots"] == 3
        assert result["retention_days"] == 365

    async def test_no_deletion_when_all_recent(
        self, db_session: AsyncSession, sample_device
    ):
        recent = datetime.now(timezone.utc) - timedelta(days=30)
        await _insert_hw_snapshots(db_session, sample_device.id, 5, recent)

        svc = RetentionService(db_session)
        result = await svc.cleanup_old_snapshots(retention_days=365)

        assert result["deleted"]["hardware_snapshots"] == 0


@pytest.mark.asyncio
class TestArchiveAuditLogs:
    """Tests for archive_audit_logs."""

    async def test_reports_eligible_when_no_archive_table(
        self, db_session: AsyncSession
    ):
        """When audit_logs_archive does not exist, report but do not delete."""
        svc = RetentionService(db_session)
        result = await svc.archive_audit_logs(older_than_days=1095)

        assert result["archive_table_exists"] is False
        assert result["deleted"] == 0
        assert "eligible_rows" in result


@pytest.mark.asyncio
class TestGetRetentionStats:
    """Tests for get_retention_stats."""

    async def test_returns_table_stats(self, db_session: AsyncSession):
        svc = RetentionService(db_session)
        result = await svc.get_retention_stats()

        assert "tables" in result
        table_names = [t["table"] for t in result["tables"]]
        assert "logon_events" in table_names
        assert "usb_events" in table_names
        assert "file_events" in table_names
        assert "hardware_snapshots" in table_names
        assert "audit_logs" in table_names

        for table in result["tables"]:
            assert "row_count" in table
            assert "size" in table
            assert "oldest_record" in table
