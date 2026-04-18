"""Unit tests for app/services/report_service.py."""

from __future__ import annotations

import asyncio
import inspect
from unittest.mock import AsyncMock, MagicMock

from app.services.report_service import ReportService


class TestReportServiceStructure:
    def test_is_class(self) -> None:
        assert isinstance(ReportService, type)

    def test_init_accepts_db_param(self) -> None:
        sig = inspect.signature(ReportService.__init__)
        assert "db" in sig.parameters

    def test_init_stores_db(self) -> None:
        mock_db = MagicMock()
        svc = ReportService(db=mock_db)
        assert svc.db is mock_db

    def test_generate_sam_report_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ReportService.generate_sam_report)

    def test_generate_asset_report_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ReportService.generate_asset_report)

    def test_generate_security_report_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(ReportService.generate_security_report)

    def test_has_three_report_methods(self) -> None:
        report_methods = [
            name for name in dir(ReportService)
            if name.startswith("generate_") and callable(getattr(ReportService, name))
        ]
        assert len(report_methods) == 3

    def test_generate_sam_report_accepts_date_filters(self) -> None:
        sig = inspect.signature(ReportService.generate_sam_report)
        params = list(sig.parameters.keys())
        assert "date_from" in params
        assert "date_to" in params

    def test_date_from_defaults_to_none(self) -> None:
        sig = inspect.signature(ReportService.generate_sam_report)
        assert sig.parameters["date_from"].default is None

    def test_date_to_defaults_to_none(self) -> None:
        sig = inspect.signature(ReportService.generate_sam_report)
        assert sig.parameters["date_to"].default is None


class TestGenerateSamReportCSV:
    """Tests for SAM report CSV output structure."""

    def _make_db(self, rows: list) -> AsyncMock:
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = rows
        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        return mock_db

    def test_sam_report_returns_string(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        assert isinstance(result, str)

    def test_sam_report_contains_header_row(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        first_line = result.splitlines()[0]
        assert "software_name" in first_line
        assert "vendor" in first_line

    def test_sam_report_header_has_license_type(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        assert "license_type" in result.splitlines()[0]

    def test_sam_report_header_has_compliance_fields(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        first_line = result.splitlines()[0]
        assert "is_compliant" in first_line
        assert "over_deployed" in first_line

    def test_sam_report_header_has_report_generated_at(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        assert "report_generated_at" in result.splitlines()[0]

    def test_sam_report_empty_db_has_only_header(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        lines = [line for line in result.splitlines() if line]
        assert len(lines) == 1

    def test_sam_report_header_column_count(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_sam_report())
        columns = result.splitlines()[0].split(",")
        assert len(columns) == 16


class TestGenerateAssetReportCSV:
    """Tests for asset report CSV output structure."""

    def _make_db(self, rows: list) -> AsyncMock:
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = rows
        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        return mock_db

    def test_asset_report_returns_string(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        assert isinstance(result, str)

    def test_asset_report_contains_header_row(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        first_line = result.splitlines()[0]
        assert "hostname" in first_line
        assert "ip_address" in first_line

    def test_asset_report_header_has_id(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        assert result.splitlines()[0].startswith("id,")

    def test_asset_report_header_has_status(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        assert "status" in result.splitlines()[0]

    def test_asset_report_header_has_mac_address(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        assert "mac_address" in result.splitlines()[0]

    def test_asset_report_header_has_report_generated_at(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        assert "report_generated_at" in result.splitlines()[0]

    def test_asset_report_empty_db_has_only_header(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        lines = [line for line in result.splitlines() if line]
        assert len(lines) == 1

    def test_asset_report_header_column_count(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_asset_report())
        columns = result.splitlines()[0].split(",")
        assert len(columns) == 10


class TestGenerateSecurityReportCSV:
    """Tests for security report CSV output structure."""

    def _make_db(self, rows: list) -> AsyncMock:
        mock_result = MagicMock()
        mock_result.all.return_value = rows
        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        return mock_db

    def test_security_report_returns_string(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert isinstance(result, str)

    def test_security_report_contains_header_row(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        first_line = result.splitlines()[0]
        assert "hostname" in first_line
        assert "device_id" in first_line

    def test_security_report_header_has_defender_field(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert "defender_on" in result.splitlines()[0]

    def test_security_report_header_has_bitlocker_field(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert "bitlocker_on" in result.splitlines()[0]

    def test_security_report_header_has_pending_patches(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert "pending_patches" in result.splitlines()[0]

    def test_security_report_header_has_checked_at(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert "checked_at" in result.splitlines()[0]

    def test_security_report_header_has_report_generated_at(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        assert "report_generated_at" in result.splitlines()[0]

    def test_security_report_empty_db_has_only_header(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        lines = [line for line in result.splitlines() if line]
        assert len(lines) == 1

    def test_security_report_header_column_count(self) -> None:
        svc = ReportService(db=self._make_db([]))
        result = asyncio.run(svc.generate_security_report())
        columns = result.splitlines()[0].split(",")
        assert len(columns) == 8
