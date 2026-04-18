"""Unit tests for software_inventory, m365, scheduled_task, and security Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.m365 import (
    M365LicenseListResponse,
    M365LicenseResponse,
    M365SyncRequest,
    M365SyncResponse,
    M365UserListResponse,
    M365UserResponse,
)
from app.schemas.scheduled_task import (
    ScheduledTaskRunResponse,
    ScheduledTaskUpdate,
)
from app.schemas.security import (
    BitLockerSummary,
    DefenderSummary,
    DeviceSecurityDetail,
    PatchSummary,
    SecurityOverview,
)
from app.schemas.software_inventory import (
    SoftwareAggregation,
    SoftwareInventoryResponse,
)

# ---------------------------------------------------------------------------
# SoftwareInventoryResponse
# ---------------------------------------------------------------------------


class TestSoftwareInventoryResponse:
    def test_basic_construction(self) -> None:
        r = SoftwareInventoryResponse(
            id=1,
            device_id=uuid.uuid4(),
            software_name="Microsoft Office",
            detected_at=datetime.now(timezone.utc),
        )
        assert r.version is None
        assert r.publisher is None
        assert r.install_date is None

    def test_with_all_fields(self) -> None:
        r = SoftwareInventoryResponse(
            id=42,
            device_id=uuid.uuid4(),
            software_name="Visual Studio Code",
            version="1.87.0",
            publisher="Microsoft",
            install_date=date(2026, 1, 15),
            detected_at=datetime.now(timezone.utc),
        )
        assert r.version == "1.87.0"
        assert r.publisher == "Microsoft"
        assert r.install_date == date(2026, 1, 15)

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            SoftwareInventoryResponse(id=1, device_id=uuid.uuid4())  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# SoftwareAggregation
# ---------------------------------------------------------------------------


class TestSoftwareAggregation:
    def test_publisher_optional(self) -> None:
        a = SoftwareAggregation(software_name="7-Zip", installed_count=50)
        assert a.publisher is None

    def test_with_publisher(self) -> None:
        a = SoftwareAggregation(
            software_name="Chrome", publisher="Google", installed_count=200
        )
        assert a.publisher == "Google"
        assert a.installed_count == 200


# ---------------------------------------------------------------------------
# M365LicenseResponse
# ---------------------------------------------------------------------------


class TestM365LicenseResponse:
    def test_construction(self) -> None:
        r = M365LicenseResponse(
            sku_id="abc-123",
            sku_part_number="ENTERPRISEPREMIUM",
            consumed_units=50,
            prepaid_enabled=100,
            prepaid_suspended=0,
            prepaid_warning=5,
            capability_status="Enabled",
        )
        assert r.sku_id == "abc-123"
        assert r.capability_status == "Enabled"

    def test_missing_field_raises(self) -> None:
        with pytest.raises(ValidationError):
            M365LicenseResponse(sku_id="id", sku_part_number="part")  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# M365LicenseListResponse
# ---------------------------------------------------------------------------


class TestM365LicenseListResponse:
    def test_empty_list(self) -> None:
        r = M365LicenseListResponse(items=[], total=0)
        assert r.total == 0
        assert r.items == []

    def test_with_items(self) -> None:
        item = M365LicenseResponse(
            sku_id="sku-1",
            sku_part_number="PART",
            consumed_units=10,
            prepaid_enabled=20,
            prepaid_suspended=0,
            prepaid_warning=1,
            capability_status="Enabled",
        )
        r = M365LicenseListResponse(items=[item], total=1)
        assert r.total == 1
        assert len(r.items) == 1


# ---------------------------------------------------------------------------
# M365UserResponse
# ---------------------------------------------------------------------------


class TestM365UserResponse:
    def test_defaults(self) -> None:
        r = M365UserResponse(id="user-001")
        assert r.display_name is None
        assert r.mail is None
        assert r.account_enabled is None
        assert r.assigned_license_count == 0

    def test_with_all_fields(self) -> None:
        r = M365UserResponse(
            id="user-002",
            display_name="Alice Smith",
            mail="alice@example.com",
            user_principal_name="alice@example.onmicrosoft.com",
            account_enabled=True,
            assigned_license_count=3,
        )
        assert r.display_name == "Alice Smith"
        assert r.account_enabled is True
        assert r.assigned_license_count == 3


# ---------------------------------------------------------------------------
# M365UserListResponse
# ---------------------------------------------------------------------------


class TestM365UserListResponse:
    def test_construction(self) -> None:
        r = M365UserListResponse(
            items=[M365UserResponse(id="u1"), M365UserResponse(id="u2")],
            total=2,
        )
        assert r.total == 2
        assert len(r.items) == 2


# ---------------------------------------------------------------------------
# M365SyncRequest
# ---------------------------------------------------------------------------


class TestM365SyncRequest:
    def test_all_defaults_true(self) -> None:
        r = M365SyncRequest()
        assert r.sync_licenses is True
        assert r.sync_users is True
        assert r.sync_devices is True
        assert r.sync_alerts is True

    def test_selective_sync(self) -> None:
        r = M365SyncRequest(sync_licenses=True, sync_users=False, sync_devices=False, sync_alerts=False)
        assert r.sync_users is False
        assert r.sync_licenses is True


# ---------------------------------------------------------------------------
# M365SyncResponse
# ---------------------------------------------------------------------------


class TestM365SyncResponse:
    def test_defaults(self) -> None:
        r = M365SyncResponse(status="ok", message="Sync complete")
        assert r.details == {}

    def test_with_details(self) -> None:
        r = M365SyncResponse(
            status="ok",
            message="done",
            details={"licenses_synced": 10, "users_synced": 100},
        )
        assert r.details["licenses_synced"] == 10


# ---------------------------------------------------------------------------
# ScheduledTaskUpdate
# ---------------------------------------------------------------------------


class TestScheduledTaskUpdate:
    def test_all_optional(self) -> None:
        u = ScheduledTaskUpdate()
        assert u.is_enabled is None
        assert u.cron_expression is None
        assert u.description is None

    def test_enable_with_new_cron(self) -> None:
        u = ScheduledTaskUpdate(is_enabled=True, cron_expression="0 3 * * *")
        assert u.is_enabled is True
        assert u.cron_expression == "0 3 * * *"

    def test_disable_only(self) -> None:
        u = ScheduledTaskUpdate(is_enabled=False)
        assert u.is_enabled is False
        assert u.cron_expression is None


# ---------------------------------------------------------------------------
# ScheduledTaskRunResponse
# ---------------------------------------------------------------------------


class TestScheduledTaskRunResponse:
    def test_construction(self) -> None:
        r = ScheduledTaskRunResponse(
            task_id=uuid.uuid4(),
            task_name="m365_sync",
            status="queued",
            message="Task has been queued for execution.",
        )
        assert r.status == "queued"
        assert r.message == "Task has been queued for execution."

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            ScheduledTaskRunResponse(task_id=uuid.uuid4())  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# DefenderSummary / BitLockerSummary / PatchSummary
# ---------------------------------------------------------------------------


class TestDefenderSummary:
    def test_all_defaults_zero(self) -> None:
        s = DefenderSummary()
        assert s.enabled_count == 0
        assert s.disabled_count == 0
        assert s.enabled_percentage == 0.0

    def test_with_values(self) -> None:
        s = DefenderSummary(enabled_count=90, disabled_count=10, enabled_percentage=90.0)
        assert s.enabled_percentage == 90.0


class TestBitLockerSummary:
    def test_all_defaults_zero(self) -> None:
        s = BitLockerSummary()
        assert s.enabled_count == 0
        assert s.disabled_count == 0
        assert s.enabled_percentage == 0.0


class TestPatchSummary:
    def test_all_defaults_zero(self) -> None:
        s = PatchSummary()
        assert s.total_pending == 0
        assert s.devices_with_pending == 0
        assert s.devices_fully_patched == 0


# ---------------------------------------------------------------------------
# SecurityOverview
# ---------------------------------------------------------------------------


class TestSecurityOverview:
    def test_defaults(self) -> None:
        s = SecurityOverview()
        assert s.total_devices_with_status == 0
        assert isinstance(s.defender, DefenderSummary)
        assert isinstance(s.bitlocker, BitLockerSummary)
        assert isinstance(s.patches, PatchSummary)

    def test_with_nested(self) -> None:
        s = SecurityOverview(
            total_devices_with_status=100,
            defender=DefenderSummary(enabled_count=95, disabled_count=5, enabled_percentage=95.0),
            bitlocker=BitLockerSummary(enabled_count=80, disabled_count=20, enabled_percentage=80.0),
            patches=PatchSummary(total_pending=15, devices_with_pending=8, devices_fully_patched=92),
        )
        assert s.total_devices_with_status == 100
        assert s.defender.enabled_count == 95
        assert s.bitlocker.enabled_percentage == 80.0
        assert s.patches.total_pending == 15


# ---------------------------------------------------------------------------
# DeviceSecurityDetail
# ---------------------------------------------------------------------------


class TestDeviceSecurityDetail:
    def test_defaults(self) -> None:
        d = DeviceSecurityDetail(device_id=uuid.uuid4(), hostname="PC-001")
        assert d.defender_on is False
        assert d.bitlocker_on is False
        assert d.pending_patches == 0
        assert d.os_version is None
        assert d.pattern_date is None
        assert d.last_checked_at is None

    def test_with_security_enabled(self) -> None:
        d = DeviceSecurityDetail(
            device_id=uuid.uuid4(),
            hostname="PC-002",
            os_version="Windows 11 23H2",
            defender_on=True,
            bitlocker_on=True,
            pattern_date="2026-04-18",
            pending_patches=3,
            last_checked_at=datetime.now(timezone.utc),
        )
        assert d.defender_on is True
        assert d.bitlocker_on is True
        assert d.pending_patches == 3
