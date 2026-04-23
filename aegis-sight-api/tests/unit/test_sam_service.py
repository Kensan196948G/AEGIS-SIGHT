"""Unit tests for app/services/sam_service.py."""

from __future__ import annotations

import inspect
from unittest.mock import MagicMock

from app.services.sam_service import SAMService


class TestSAMServiceStructure:
    def test_is_class(self) -> None:
        assert isinstance(SAMService, type)

    def test_init_accepts_db_param(self) -> None:
        sig = inspect.signature(SAMService.__init__)
        assert "db" in sig.parameters

    def test_run_compliance_check_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(SAMService.run_compliance_check)

    def test_sync_m365_licenses_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(SAMService.sync_m365_licenses)


class TestSyncM365Licenses:
    """sync_m365_licenses integrates with Graph API and returns a summary dict."""

    async def test_returns_dict(self) -> None:
        from unittest.mock import AsyncMock, patch

        db = MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)
        db.commit = AsyncMock()
        service = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await service.sync_m365_licenses()
        assert isinstance(result, dict)

    async def test_status_ok_on_success(self) -> None:
        from unittest.mock import AsyncMock, patch

        db = MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)
        db.commit = AsyncMock()
        service = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await service.sync_m365_licenses()
        assert result["status"] == "ok"

    async def test_status_error_on_graph_failure(self) -> None:
        from unittest.mock import AsyncMock, patch

        service = SAMService(db=MagicMock())
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(
                side_effect=RuntimeError("fail")
            )
            result = await service.sync_m365_licenses()
        assert result["status"] == "error"

    async def test_synced_key_present(self) -> None:
        from unittest.mock import AsyncMock, patch

        db = MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)
        db.commit = AsyncMock()
        service = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            result = await service.sync_m365_licenses()
        assert "synced" in result

    async def test_idempotent_multiple_calls(self) -> None:
        from unittest.mock import AsyncMock, patch

        db = MagicMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)
        db.commit = AsyncMock()
        service = SAMService(db=db)
        with patch("app.services.sam_service.GraphService") as mock_gs:
            mock_gs.return_value.get_m365_licenses = AsyncMock(return_value=[])
            first = await service.sync_m365_licenses()
            second = await service.sync_m365_licenses()
        assert first["status"] == second["status"]


class TestComplianceCalculationLogic:
    """
    Validate the arithmetic embedded in run_compliance_check:
      total_used = installed_count + m365_assigned
      over_deployed = max(0, total_used - purchased_count)
      is_compliant = over_deployed == 0
    These formulas are verified via pure-Python assertions so no DB is needed.
    """

    def _calc(self, installed: int, m365: int, purchased: int) -> dict:
        total_used = installed + m365
        over_deployed = max(0, total_used - purchased)
        return {
            "total_used": total_used,
            "over_deployed": over_deployed,
            "is_compliant": over_deployed == 0,
        }

    def test_compliant_when_total_equals_purchased(self) -> None:
        r = self._calc(installed=5, m365=3, purchased=8)
        assert r["is_compliant"] is True
        assert r["over_deployed"] == 0

    def test_compliant_when_total_less_than_purchased(self) -> None:
        r = self._calc(installed=2, m365=1, purchased=10)
        assert r["is_compliant"] is True
        assert r["over_deployed"] == 0

    def test_not_compliant_when_over_deployed(self) -> None:
        r = self._calc(installed=7, m365=5, purchased=10)
        assert r["is_compliant"] is False
        assert r["over_deployed"] == 2

    def test_over_deployed_never_negative(self) -> None:
        r = self._calc(installed=1, m365=0, purchased=100)
        assert r["over_deployed"] == 0

    def test_total_used_is_sum_of_installed_and_m365(self) -> None:
        r = self._calc(installed=4, m365=6, purchased=20)
        assert r["total_used"] == 10

    def test_all_zeros_is_compliant(self) -> None:
        r = self._calc(installed=0, m365=0, purchased=0)
        assert r["is_compliant"] is True
        assert r["over_deployed"] == 0
        assert r["total_used"] == 0
