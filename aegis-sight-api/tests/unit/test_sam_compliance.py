"""Unit tests for SAMService.run_compliance_check (Issue #443).

Uses AsyncMock session and MagicMock license objects — no real database.
"""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.sam_service import SAMService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_license(
    *,
    software_name: str = "TestSW",
    purchased_count: int = 10,
    installed_count: int = 5,
    m365_assigned: int = 0,
    lic_id=None,
) -> MagicMock:
    """Return a MagicMock mimicking SoftwareLicense model."""
    lic = MagicMock()
    lic.id = lic_id or uuid.uuid4()
    lic.software_name = software_name
    lic.purchased_count = purchased_count
    lic.installed_count = installed_count
    lic.m365_assigned = m365_assigned
    return lic


def _make_db(licenses: list) -> AsyncMock:
    """Return AsyncMock session that returns the given licenses from execute()."""
    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = licenses
    db = AsyncMock()
    db.execute = AsyncMock(return_value=execute_result)
    return db


# ---------------------------------------------------------------------------
# Empty list
# ---------------------------------------------------------------------------


class TestRunComplianceCheckEmpty:
    def test_returns_empty_list_when_no_licenses(self) -> None:
        db = _make_db([])
        svc = SAMService(db)
        result = asyncio.run(svc.run_compliance_check())
        assert result == []

    def test_execute_called_once_when_no_licenses(self) -> None:
        db = _make_db([])
        svc = SAMService(db)
        asyncio.run(svc.run_compliance_check())
        db.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# Single license — compliant
# ---------------------------------------------------------------------------


class TestRunComplianceCheckCompliant:
    def test_returns_one_result_for_one_license(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=5, m365_assigned=3)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert len(result) == 1

    def test_is_compliant_when_under_purchased(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=5, m365_assigned=3)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].is_compliant is True

    def test_over_deployed_is_zero_when_compliant(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=5, m365_assigned=3)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].over_deployed == 0

    def test_total_used_equals_installed_plus_m365(self) -> None:
        lic = _make_license(purchased_count=20, installed_count=7, m365_assigned=4)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].total_used == 11

    def test_compliant_when_exactly_equal_to_purchased(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=6, m365_assigned=4)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].is_compliant is True
        assert result[0].over_deployed == 0


# ---------------------------------------------------------------------------
# Single license — over-deployed
# ---------------------------------------------------------------------------


class TestRunComplianceCheckOverDeployed:
    def test_not_compliant_when_over_deployed(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=8, m365_assigned=5)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].is_compliant is False

    def test_over_deployed_count_is_correct(self) -> None:
        lic = _make_license(purchased_count=10, installed_count=8, m365_assigned=5)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        # total_used=13, purchased=10 → over_deployed=3
        assert result[0].over_deployed == 3

    def test_over_deployed_never_negative(self) -> None:
        lic = _make_license(purchased_count=100, installed_count=1, m365_assigned=0)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].over_deployed >= 0

    def test_all_zeros_is_compliant(self) -> None:
        lic = _make_license(purchased_count=0, installed_count=0, m365_assigned=0)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].is_compliant is True
        assert result[0].over_deployed == 0


# ---------------------------------------------------------------------------
# Response object fields
# ---------------------------------------------------------------------------


class TestComplianceCheckResponseFields:
    def test_license_id_matches_model(self) -> None:
        lic_id = uuid.uuid4()
        lic = _make_license(lic_id=lic_id)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].license_id == lic_id

    def test_software_name_matches_model(self) -> None:
        lic = _make_license(software_name="Adobe Acrobat")
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].software_name == "Adobe Acrobat"

    def test_purchased_count_in_response(self) -> None:
        lic = _make_license(purchased_count=50)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].purchased_count == 50

    def test_installed_count_in_response(self) -> None:
        lic = _make_license(installed_count=25)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].installed_count == 25

    def test_m365_assigned_in_response(self) -> None:
        lic = _make_license(m365_assigned=10)
        db = _make_db([lic])
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert result[0].m365_assigned == 10


# ---------------------------------------------------------------------------
# Multiple licenses
# ---------------------------------------------------------------------------


class TestRunComplianceCheckMultiple:
    def test_returns_result_per_license(self) -> None:
        lics = [
            _make_license(software_name="A", purchased_count=10, installed_count=5),
            _make_license(software_name="B", purchased_count=5, installed_count=8),
            _make_license(software_name="C", purchased_count=20, installed_count=20),
        ]
        db = _make_db(lics)
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert len(result) == 3

    def test_mixed_compliant_and_over_deployed(self) -> None:
        lics = [
            _make_license(software_name="OK", purchased_count=10, installed_count=5),
            _make_license(software_name="BAD", purchased_count=5, installed_count=8),
        ]
        db = _make_db(lics)
        result = asyncio.run(SAMService(db).run_compliance_check())
        compliant = [r for r in result if r.is_compliant]
        not_compliant = [r for r in result if not r.is_compliant]
        assert len(compliant) == 1
        assert len(not_compliant) == 1

    def test_order_preserved(self) -> None:
        lics = [
            _make_license(software_name="First"),
            _make_license(software_name="Second"),
            _make_license(software_name="Third"),
        ]
        db = _make_db(lics)
        result = asyncio.run(SAMService(db).run_compliance_check())
        assert [r.software_name for r in result] == ["First", "Second", "Third"]
