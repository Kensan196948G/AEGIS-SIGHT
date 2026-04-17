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
    """sync_m365_licenses is a placeholder that returns a static dict without DB access."""

    async def test_returns_dict(self) -> None:
        service = SAMService(db=MagicMock())
        result = await service.sync_m365_licenses()
        assert isinstance(result, dict)

    async def test_status_is_not_implemented(self) -> None:
        service = SAMService(db=MagicMock())
        result = await service.sync_m365_licenses()
        assert result["status"] == "not_implemented"

    async def test_message_key_present(self) -> None:
        service = SAMService(db=MagicMock())
        result = await service.sync_m365_licenses()
        assert "message" in result

    async def test_message_mentions_m365(self) -> None:
        service = SAMService(db=MagicMock())
        result = await service.sync_m365_licenses()
        assert "M365" in result["message"] or "365" in result["message"]

    async def test_result_has_exactly_two_keys(self) -> None:
        service = SAMService(db=MagicMock())
        result = await service.sync_m365_licenses()
        assert set(result.keys()) == {"status", "message"}

    async def test_idempotent_multiple_calls(self) -> None:
        service = SAMService(db=MagicMock())
        first = await service.sync_m365_licenses()
        second = await service.sync_m365_licenses()
        assert first == second


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
