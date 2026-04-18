"""Unit tests for app/tasks/sam_tasks.py, procurement_tasks.py, retention_tasks.py."""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.tasks import procurement_tasks, retention_tasks, sam_tasks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_session_factory(mock_session: AsyncMock) -> MagicMock:
    """Return a mock async session factory usable in `async with factory() as session`."""
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=mock_cm)


# ===========================================================================
# sam_tasks — task attribute tests
# ===========================================================================

class TestSamTaskAttributes:
    def test_daily_reconciliation_name(self) -> None:
        assert sam_tasks.daily_reconciliation.name == "app.tasks.sam_tasks.daily_reconciliation"

    def test_daily_reconciliation_max_retries(self) -> None:
        assert sam_tasks.daily_reconciliation.max_retries == 3

    def test_daily_reconciliation_retry_delay(self) -> None:
        assert sam_tasks.daily_reconciliation.default_retry_delay == 300

    def test_check_license_expiry_name(self) -> None:
        assert sam_tasks.check_license_expiry.name == "app.tasks.sam_tasks.check_license_expiry"

    def test_check_license_expiry_max_retries(self) -> None:
        assert sam_tasks.check_license_expiry.max_retries == 3

    def test_check_license_expiry_retry_delay(self) -> None:
        assert sam_tasks.check_license_expiry.default_retry_delay == 300


# ===========================================================================
# sam_tasks — _run_reconciliation() helper
# ===========================================================================

class TestRunReconciliation:
    def _make_license(self, purchased: int, installed: int, m365: int) -> MagicMock:
        lic = MagicMock()
        lic.id = "uuid-1"
        lic.software_name = "TestSW"
        lic.purchased_count = purchased
        lic.installed_count = installed
        lic.m365_assigned = m365
        return lic

    def _make_session(self, licenses: list) -> AsyncMock:
        result = MagicMock()
        result.scalars.return_value.all.return_value = licenses
        session = AsyncMock()
        session.execute.return_value = result
        return session

    def test_empty_db_returns_zero_violations(self) -> None:
        session = self._make_session([])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_reconciliation())
        assert result["total_checked"] == 0
        assert result["violations_count"] == 0
        assert result["violations"] == []

    def test_compliant_license_no_violation(self) -> None:
        lic = self._make_license(purchased=10, installed=5, m365=3)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_reconciliation())
        assert result["violations_count"] == 0
        assert result["total_checked"] == 1

    def test_over_deployed_license_creates_violation(self) -> None:
        lic = self._make_license(purchased=5, installed=6, m365=2)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_reconciliation())
        assert result["violations_count"] == 1
        assert result["violations"][0]["over_deployed"] == 3

    def test_violation_contains_software_name(self) -> None:
        lic = self._make_license(purchased=1, installed=2, m365=0)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_reconciliation())
        assert result["violations"][0]["software_name"] == "TestSW"

    def test_return_has_required_keys(self) -> None:
        session = self._make_session([])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_reconciliation())
        assert "total_checked" in result
        assert "violations_count" in result
        assert "violations" in result


# ===========================================================================
# sam_tasks — _run_license_expiry_check() helper
# ===========================================================================

class TestRunLicenseExpiryCheck:
    def _make_license(self, expiry_offset_days: int | None) -> MagicMock:
        lic = MagicMock()
        lic.id = "uuid-2"
        lic.software_name = "ExpiryTestSW"
        lic.vendor = "TestVendor"
        if expiry_offset_days is None:
            lic.expiry_date = None
        else:
            lic.expiry_date = date.today() + timedelta(days=expiry_offset_days)
        return lic

    def _make_session(self, licenses: list) -> AsyncMock:
        result = MagicMock()
        result.scalars.return_value.all.return_value = licenses
        session = AsyncMock()
        session.execute.return_value = result
        return session

    def test_empty_db_returns_empty_lists(self) -> None:
        session = self._make_session([])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_license_expiry_check())
        assert result["already_expired"] == []
        assert result["expiring_30_days"] == []

    def test_expired_license_in_already_expired(self) -> None:
        lic = self._make_license(expiry_offset_days=-10)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_license_expiry_check())
        assert len(result["already_expired"]) == 1

    def test_license_expiring_in_20_days_in_30_day_bucket(self) -> None:
        lic = self._make_license(expiry_offset_days=20)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_license_expiry_check())
        assert len(result["expiring_30_days"]) == 1

    def test_license_expiring_in_50_days_in_60_day_bucket(self) -> None:
        lic = self._make_license(expiry_offset_days=50)
        session = self._make_session([lic])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_license_expiry_check())
        assert len(result["expiring_60_days"]) == 1

    def test_result_has_expiry_keys(self) -> None:
        session = self._make_session([])
        factory = _make_session_factory(session)
        with patch.object(sam_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(sam_tasks._run_license_expiry_check())
        for key in ("already_expired", "expiring_30_days", "expiring_60_days", "expiring_90_days"):
            assert key in result


# ===========================================================================
# procurement_tasks — task attribute tests
# ===========================================================================

class TestProcurementTaskAttributes:
    def test_notify_pending_approvals_name(self) -> None:
        assert procurement_tasks.notify_pending_approvals.name == \
            "app.tasks.procurement_tasks.notify_pending_approvals"

    def test_notify_pending_approvals_max_retries(self) -> None:
        assert procurement_tasks.notify_pending_approvals.max_retries == 3

    def test_notify_pending_approvals_retry_delay(self) -> None:
        assert procurement_tasks.notify_pending_approvals.default_retry_delay == 300

    def test_generate_status_report_name(self) -> None:
        assert procurement_tasks.generate_status_report.name == \
            "app.tasks.procurement_tasks.generate_status_report"

    def test_generate_status_report_max_retries(self) -> None:
        assert procurement_tasks.generate_status_report.max_retries == 3


# ===========================================================================
# procurement_tasks — _collect_pending_approvals() helper
# ===========================================================================

class TestCollectPendingApprovals:
    def _make_session_with_rows(
        self, status_rows: list, dept_rows: list
    ) -> AsyncMock:
        result1 = MagicMock()
        result1.all.return_value = status_rows
        result2 = MagicMock()
        result2.all.return_value = dept_rows
        session = AsyncMock()
        session.execute.side_effect = [result1, result2]
        return session

    def test_empty_db_returns_zero_pending(self) -> None:
        session = self._make_session_with_rows([], [])
        factory = _make_session_factory(session)
        with patch.object(procurement_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(procurement_tasks._collect_pending_approvals())
        assert result["total_pending"] == 0

    def test_result_has_required_keys(self) -> None:
        session = self._make_session_with_rows([], [])
        factory = _make_session_factory(session)
        with patch.object(procurement_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(procurement_tasks._collect_pending_approvals())
        assert "status_counts" in result
        assert "awaiting_approval_by_department" in result
        assert "total_pending" in result

    def test_total_pending_sums_status_counts(self) -> None:
        from app.models.procurement import ProcurementStatus
        row1 = MagicMock()
        row1.__getitem__ = lambda self, i: [ProcurementStatus.submitted, 3][i]
        row2 = MagicMock()
        row2.__getitem__ = lambda self, i: [ProcurementStatus.approved, 2][i]

        result1 = MagicMock()
        result1.all.return_value = [
            (ProcurementStatus.submitted, 3),
            (ProcurementStatus.approved, 2),
        ]
        result2 = MagicMock()
        result2.all.return_value = []
        session = AsyncMock()
        session.execute.side_effect = [result1, result2]
        factory = _make_session_factory(session)
        with patch.object(procurement_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(procurement_tasks._collect_pending_approvals())
        assert result["total_pending"] == 5


# ===========================================================================
# procurement_tasks — _collect_status_summary() helper
# ===========================================================================

class TestCollectStatusSummary:
    def test_result_has_status_summary_key(self) -> None:
        mock_result = MagicMock()
        mock_result.all.return_value = []
        session = AsyncMock()
        session.execute.return_value = mock_result
        factory = _make_session_factory(session)
        with patch.object(procurement_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(procurement_tasks._collect_status_summary())
        assert "status_summary" in result

    def test_empty_db_returns_empty_summary(self) -> None:
        mock_result = MagicMock()
        mock_result.all.return_value = []
        session = AsyncMock()
        session.execute.return_value = mock_result
        factory = _make_session_factory(session)
        with patch.object(procurement_tasks, "_get_async_session_factory", return_value=factory):
            result = asyncio.run(procurement_tasks._collect_status_summary())
        assert result["status_summary"] == {}


# ===========================================================================
# retention_tasks — task attribute tests
# ===========================================================================

class TestRetentionTaskAttributes:
    def test_daily_retention_cleanup_name(self) -> None:
        assert retention_tasks.daily_retention_cleanup.name == \
            "app.tasks.retention_tasks.daily_retention_cleanup"

    def test_daily_retention_cleanup_max_retries(self) -> None:
        assert retention_tasks.daily_retention_cleanup.max_retries == 3

    def test_daily_retention_cleanup_retry_delay(self) -> None:
        assert retention_tasks.daily_retention_cleanup.default_retry_delay == 300

    def test_weekly_archive_name(self) -> None:
        assert retention_tasks.weekly_archive.name == \
            "app.tasks.retention_tasks.weekly_archive"

    def test_weekly_archive_max_retries(self) -> None:
        assert retention_tasks.weekly_archive.max_retries == 3

    def test_weekly_archive_retry_delay_is_600(self) -> None:
        assert retention_tasks.weekly_archive.default_retry_delay == 600

    def test_monthly_stats_report_name(self) -> None:
        assert retention_tasks.monthly_stats_report.name == \
            "app.tasks.retention_tasks.monthly_stats_report"

    def test_monthly_stats_report_max_retries(self) -> None:
        assert retention_tasks.monthly_stats_report.max_retries == 3

    def test_monthly_stats_report_retry_delay(self) -> None:
        assert retention_tasks.monthly_stats_report.default_retry_delay == 300


# ===========================================================================
# retention_tasks — _run_daily_cleanup() helper
# ===========================================================================

class TestRunDailyCleanup:
    def _make_session(self, logs_result: dict, snapshots_result: dict) -> AsyncMock:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.cleanup_old_logs = AsyncMock(return_value=logs_result)
        mock_svc.cleanup_old_snapshots = AsyncMock(return_value=snapshots_result)
        return session, mock_svc

    def test_returns_logs_and_snapshots_keys(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.cleanup_old_logs = AsyncMock(return_value={"deleted": 5})
        mock_svc.cleanup_old_snapshots = AsyncMock(return_value={"deleted": 2})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            result = asyncio.run(retention_tasks._run_daily_cleanup())
        assert "logs" in result
        assert "snapshots" in result

    def test_passes_retention_days_for_logs(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.cleanup_old_logs = AsyncMock(return_value={})
        mock_svc.cleanup_old_snapshots = AsyncMock(return_value={})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            asyncio.run(retention_tasks._run_daily_cleanup())
        mock_svc.cleanup_old_logs.assert_called_once_with(retention_days=1095)

    def test_passes_retention_days_for_snapshots(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.cleanup_old_logs = AsyncMock(return_value={})
        mock_svc.cleanup_old_snapshots = AsyncMock(return_value={})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            asyncio.run(retention_tasks._run_daily_cleanup())
        mock_svc.cleanup_old_snapshots.assert_called_once_with(retention_days=365)


# ===========================================================================
# retention_tasks — _run_weekly_archive() helper
# ===========================================================================

class TestRunWeeklyArchive:
    def test_returns_archive_result(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.archive_audit_logs = AsyncMock(return_value={"archived": 10})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            result = asyncio.run(retention_tasks._run_weekly_archive())
        assert result == {"archived": 10}

    def test_passes_older_than_days(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.archive_audit_logs = AsyncMock(return_value={})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            asyncio.run(retention_tasks._run_weekly_archive())
        mock_svc.archive_audit_logs.assert_called_once_with(older_than_days=1095)


# ===========================================================================
# retention_tasks — _run_monthly_stats() helper
# ===========================================================================

class TestRunMonthlyStats:
    def test_returns_stats_result(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.get_retention_stats = AsyncMock(return_value={"total_logs": 999})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            result = asyncio.run(retention_tasks._run_monthly_stats())
        assert result == {"total_logs": 999}

    def test_calls_get_retention_stats(self) -> None:
        session = AsyncMock()
        mock_svc = AsyncMock()
        mock_svc.get_retention_stats = AsyncMock(return_value={})
        factory = _make_session_factory(session)
        with patch.object(retention_tasks, "_get_async_session_factory", return_value=factory), \
             patch("app.tasks.retention_tasks.RetentionService", return_value=mock_svc):
            asyncio.run(retention_tasks._run_monthly_stats())
        mock_svc.get_retention_stats.assert_called_once()
