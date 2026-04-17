"""Unit tests for app/services/procurement_service.py."""

from __future__ import annotations

import inspect
import re
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from app.models.procurement import ProcurementCategory, ProcurementStatus
from app.services.procurement_service import ProcurementService


class TestProcurementServiceStructure:
    def test_is_class(self) -> None:
        assert isinstance(ProcurementService, type)

    def test_init_accepts_db_param(self) -> None:
        sig = inspect.signature(ProcurementService.__init__)
        assert "db" in sig.parameters

    def test_create_request_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ProcurementService.create_request)

    def test_submit_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ProcurementService.submit)

    def test_approve_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ProcurementService.approve)

    def test_dispose_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ProcurementService.dispose)


class TestProcurementStatusEnum:
    def test_draft_value(self) -> None:
        assert ProcurementStatus.draft == "draft"

    def test_submitted_value(self) -> None:
        assert ProcurementStatus.submitted == "submitted"

    def test_approved_value(self) -> None:
        assert ProcurementStatus.approved == "approved"

    def test_rejected_value(self) -> None:
        assert ProcurementStatus.rejected == "rejected"

    def test_ordered_value(self) -> None:
        assert ProcurementStatus.ordered == "ordered"

    def test_received_value(self) -> None:
        assert ProcurementStatus.received == "received"

    def test_active_value(self) -> None:
        assert ProcurementStatus.active == "active"

    def test_disposed_value(self) -> None:
        assert ProcurementStatus.disposed == "disposed"

    def test_total_status_count(self) -> None:
        assert len(ProcurementStatus) == 10

    def test_is_str_enum(self) -> None:
        assert issubclass(ProcurementStatus, str)

    def test_draft_is_default_status(self) -> None:
        # create_request always sets status=ProcurementStatus.draft
        assert ProcurementStatus.draft.value == "draft"


class TestProcurementCategoryEnum:
    def test_hardware_value(self) -> None:
        assert ProcurementCategory.hardware == "hardware"

    def test_software_value(self) -> None:
        assert ProcurementCategory.software == "software"

    def test_service_value(self) -> None:
        assert ProcurementCategory.service == "service"

    def test_consumable_value(self) -> None:
        assert ProcurementCategory.consumable == "consumable"

    def test_total_category_count(self) -> None:
        assert len(ProcurementCategory) == 4

    def test_is_str_enum(self) -> None:
        assert issubclass(ProcurementCategory, str)


class TestGenerateRequestNumber:
    """Verify the PRQ-YEAR-NNNNN format of _generate_request_number."""

    async def _make_service_with_count(self, existing_count: int) -> ProcurementService:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = existing_count
        mock_db.execute = AsyncMock(return_value=mock_result)
        return ProcurementService(db=mock_db)

    async def test_first_request_of_year_is_00001(self) -> None:
        service = await self._make_service_with_count(0)
        number = await service._generate_request_number()
        year = datetime.now(UTC).year
        assert number == f"PRQ-{year}-00001"

    async def test_second_request_of_year_is_00002(self) -> None:
        service = await self._make_service_with_count(1)
        number = await service._generate_request_number()
        year = datetime.now(UTC).year
        assert number == f"PRQ-{year}-00002"

    async def test_number_matches_expected_pattern(self) -> None:
        service = await self._make_service_with_count(0)
        number = await service._generate_request_number()
        pattern = re.compile(r"^PRQ-\d{4}-\d{5}$")
        assert pattern.match(number), f"Format mismatch: {number!r}"

    async def test_year_in_number_matches_current_year(self) -> None:
        service = await self._make_service_with_count(42)
        number = await service._generate_request_number()
        expected_year = str(datetime.now(UTC).year)
        assert number.split("-")[1] == expected_year

    async def test_sequence_padded_to_five_digits(self) -> None:
        service = await self._make_service_with_count(99)
        number = await service._generate_request_number()
        seq = number.split("-")[2]
        assert len(seq) == 5
        assert seq == "00100"
