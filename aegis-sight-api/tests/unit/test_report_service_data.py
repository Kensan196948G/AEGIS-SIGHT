"""Unit tests for ReportService — data row content validation (SAM, asset, security reports)."""

from __future__ import annotations

import asyncio
import csv
import io
import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from app.services.report_service import ReportService

# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------


def _license(
    *,
    software_name: str = "TestSW",
    vendor: str = "ACME",
    license_type_value: str = "perpetual",
    license_key: str | None = None,
    purchased_count: int = 10,
    installed_count: int = 5,
    m365_assigned: int = 0,
    cost_per_unit=None,
    currency: str = "JPY",
    purchase_date=None,
    expiry_date=None,
    vendor_contract_id: str | None = None,
) -> MagicMock:
    lic = MagicMock()
    lic.software_name = software_name
    lic.vendor = vendor
    lic.license_type = MagicMock()
    lic.license_type.value = license_type_value
    lic.license_key = license_key
    lic.purchased_count = purchased_count
    lic.installed_count = installed_count
    lic.m365_assigned = m365_assigned
    lic.cost_per_unit = cost_per_unit
    lic.currency = currency
    lic.purchase_date = purchase_date
    lic.expiry_date = expiry_date
    lic.vendor_contract_id = vendor_contract_id
    return lic


def _device(
    *,
    hostname: str = "PC-001",
    os_version: str | None = "Windows 11",
    ip_address: str | None = "192.168.1.1",
    mac_address: str | None = "AA:BB:CC:DD:EE:FF",
    domain: str | None = "corp.local",
    status_value: str = "active",
    last_seen: datetime | None = None,
    created_at: datetime | None = None,
    dev_id=None,
) -> MagicMock:
    dev = MagicMock()
    dev.id = dev_id or uuid.uuid4()
    dev.hostname = hostname
    dev.os_version = os_version
    dev.ip_address = ip_address
    dev.mac_address = mac_address
    dev.domain = domain
    dev.status = MagicMock()
    dev.status.value = status_value
    dev.last_seen = last_seen
    dev.created_at = created_at or datetime(2024, 1, 1, tzinfo=UTC)
    return dev


def _security_status(
    *,
    defender_on: bool = True,
    bitlocker_on: bool = True,
    pattern_date: str | None = "2024-01-01",
    pending_patches: int = 0,
    checked_at: datetime | None = None,
) -> MagicMock:
    sec = MagicMock()
    sec.defender_on = defender_on
    sec.bitlocker_on = bitlocker_on
    sec.pattern_date = pattern_date
    sec.pending_patches = pending_patches
    sec.checked_at = checked_at or datetime(2024, 1, 15, tzinfo=UTC)
    return sec


def _make_scalars_db(rows: list) -> AsyncMock:
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = rows
    db = AsyncMock()
    db.execute.return_value = mock_result
    return db


def _make_all_db(rows: list) -> AsyncMock:
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    db = AsyncMock()
    db.execute.return_value = mock_result
    return db


def _parse_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


# ---------------------------------------------------------------------------
# SAM report — data rows
# ---------------------------------------------------------------------------


class TestSamReportDataRows:
    def test_compliant_license_row_is_YES(self) -> None:
        lic = _license(purchased_count=10, installed_count=5, m365_assigned=3)  # total=8 ≤ 10
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["is_compliant"] == "YES"

    def test_over_deployed_license_row_is_NO(self) -> None:
        lic = _license(purchased_count=5, installed_count=8, m365_assigned=0)  # total=8 > 5
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["is_compliant"] == "NO"

    def test_over_deployed_count_correct(self) -> None:
        lic = _license(purchased_count=5, installed_count=8, m365_assigned=0)  # over=3
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["over_deployed"] == "3"

    def test_over_deployed_zero_for_compliant(self) -> None:
        lic = _license(purchased_count=10, installed_count=5, m365_assigned=2)
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["over_deployed"] == "0"

    def test_total_used_is_installed_plus_m365(self) -> None:
        lic = _license(purchased_count=20, installed_count=6, m365_assigned=4)  # total=10
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["total_used"] == "10"

    def test_software_name_in_row(self) -> None:
        lic = _license(software_name="SpecialApp")
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["software_name"] == "SpecialApp"

    def test_vendor_in_row(self) -> None:
        lic = _license(vendor="MegaCorp")
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["vendor"] == "MegaCorp"

    def test_license_type_value_in_row(self) -> None:
        lic = _license(license_type_value="subscription")
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert rows[0]["license_type"] == "subscription"

    def test_multiple_licenses_produce_multiple_rows(self) -> None:
        lics = [_license(software_name=f"App{i}") for i in range(3)]
        svc = ReportService(db=_make_scalars_db(lics))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        assert len(rows) == 3

    def test_report_generated_at_is_isoformat(self) -> None:
        lic = _license()
        svc = ReportService(db=_make_scalars_db([lic]))
        result = asyncio.run(svc.generate_sam_report())
        rows = _parse_csv(result)
        ts = rows[0]["report_generated_at"]
        # Should be parseable as ISO datetime
        datetime.fromisoformat(ts)


# ---------------------------------------------------------------------------
# Asset report — data rows
# ---------------------------------------------------------------------------


class TestAssetReportDataRows:
    def test_hostname_in_row(self) -> None:
        dev = _device(hostname="SERVER-01")
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert rows[0]["hostname"] == "SERVER-01"

    def test_ip_address_in_row(self) -> None:
        dev = _device(ip_address="10.0.0.1")
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert rows[0]["ip_address"] == "10.0.0.1"

    def test_status_value_in_row(self) -> None:
        dev = _device(status_value="inactive")
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert rows[0]["status"] == "inactive"

    def test_last_seen_formatted_when_set(self) -> None:
        ts = datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)
        dev = _device(last_seen=ts)
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert "2024-06-15" in rows[0]["last_seen"]

    def test_last_seen_empty_when_none(self) -> None:
        dev = _device(last_seen=None)
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert rows[0]["last_seen"] == ""

    def test_mac_address_in_row(self) -> None:
        dev = _device(mac_address="11:22:33:44:55:66")
        svc = ReportService(db=_make_scalars_db([dev]))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert rows[0]["mac_address"] == "11:22:33:44:55:66"

    def test_multiple_devices_produce_multiple_rows(self) -> None:
        devs = [_device(hostname=f"PC-{i:03d}") for i in range(4)]
        svc = ReportService(db=_make_scalars_db(devs))
        result = asyncio.run(svc.generate_asset_report())
        rows = _parse_csv(result)
        assert len(rows) == 4


# ---------------------------------------------------------------------------
# Security report — data rows
# ---------------------------------------------------------------------------


class TestSecurityReportDataRows:
    def test_defender_on_true_yields_YES(self) -> None:
        sec = _security_status(defender_on=True)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["defender_on"] == "YES"

    def test_defender_on_false_yields_NO(self) -> None:
        sec = _security_status(defender_on=False)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["defender_on"] == "NO"

    def test_bitlocker_on_true_yields_YES(self) -> None:
        sec = _security_status(bitlocker_on=True)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["bitlocker_on"] == "YES"

    def test_bitlocker_on_false_yields_NO(self) -> None:
        sec = _security_status(bitlocker_on=False)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["bitlocker_on"] == "NO"

    def test_pending_patches_count_in_row(self) -> None:
        sec = _security_status(pending_patches=7)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["pending_patches"] == "7"

    def test_hostname_in_security_row(self) -> None:
        sec = _security_status()
        dev = _device(hostname="CRITICAL-HOST")
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert rows[0]["hostname"] == "CRITICAL-HOST"

    def test_checked_at_is_isoformat(self) -> None:
        ts = datetime(2024, 3, 20, 8, 30, 0, tzinfo=UTC)
        sec = _security_status(checked_at=ts)
        dev = _device()
        svc = ReportService(db=_make_all_db([(sec, dev)]))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert "2024-03-20" in rows[0]["checked_at"]

    def test_multiple_security_rows(self) -> None:
        pairs = [(_security_status(), _device(hostname=f"PC-{i}")) for i in range(3)]
        svc = ReportService(db=_make_all_db(pairs))
        result = asyncio.run(svc.generate_security_report())
        rows = _parse_csv(result)
        assert len(rows) == 3
