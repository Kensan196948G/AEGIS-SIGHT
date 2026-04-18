"""Unit tests for patch, notification_channel, and network_device Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.network_device import NetworkDeviceType
from app.models.notification_channel import ChannelType, NotificationEventType
from app.models.patch import PatchStatus, UpdateSeverity, VulnerabilitySeverity
from app.schemas.network_device import (
    NetworkDeviceLinkRequest,
    NetworkScanEntry,
    NetworkScanRequest,
    NetworkScanResponse,
)
from app.schemas.notification_channel import (
    NotificationChannelCreate,
    NotificationChannelTestResult,
    NotificationChannelUpdate,
    NotificationRuleCreate,
    NotificationRuleUpdate,
)
from app.schemas.patch import (
    DevicePatchStatusCreate,
    PatchComplianceSummary,
    VulnerabilityCreate,
    WindowsUpdateCreate,
)

# ---------------------------------------------------------------------------
# WindowsUpdateCreate
# ---------------------------------------------------------------------------


class TestWindowsUpdateCreate:
    def test_basic_construction(self) -> None:
        w = WindowsUpdateCreate(
            kb_number="KB5034763",
            title="Security Update",
            severity=UpdateSeverity.critical,
            release_date=datetime.now(timezone.utc),
        )
        assert w.kb_number == "KB5034763"
        assert w.description is None

    def test_all_severities(self) -> None:
        for sev in UpdateSeverity:
            w = WindowsUpdateCreate(
                kb_number="KB0000001",
                title="T",
                severity=sev,
                release_date=datetime.now(timezone.utc),
            )
            assert w.severity == sev

    def test_kb_number_max_50(self) -> None:
        WindowsUpdateCreate(
            kb_number="K" * 50,
            title="T",
            severity=UpdateSeverity.low,
            release_date=datetime.now(timezone.utc),
        )

    def test_kb_number_over_50_raises(self) -> None:
        with pytest.raises(ValidationError):
            WindowsUpdateCreate(
                kb_number="K" * 51,
                title="T",
                severity=UpdateSeverity.low,
                release_date=datetime.now(timezone.utc),
            )

    def test_title_max_500(self) -> None:
        WindowsUpdateCreate(
            kb_number="KB1",
            title="T" * 500,
            severity=UpdateSeverity.important,
            release_date=datetime.now(timezone.utc),
        )

    def test_title_over_500_raises(self) -> None:
        with pytest.raises(ValidationError):
            WindowsUpdateCreate(
                kb_number="KB1",
                title="T" * 501,
                severity=UpdateSeverity.moderate,
                release_date=datetime.now(timezone.utc),
            )

    def test_with_description(self) -> None:
        w = WindowsUpdateCreate(
            kb_number="KB1234567",
            title="Patch",
            severity=UpdateSeverity.important,
            release_date=datetime.now(timezone.utc),
            description="Fixes a remote code execution vulnerability.",
        )
        assert "remote code execution" in w.description


# ---------------------------------------------------------------------------
# DevicePatchStatusCreate
# ---------------------------------------------------------------------------


class TestDevicePatchStatusCreate:
    def test_default_status_not_installed(self) -> None:
        p = DevicePatchStatusCreate(
            device_id=uuid.uuid4(),
            update_id=uuid.uuid4(),
        )
        assert p.status == PatchStatus.not_installed
        assert p.installed_at is None
        assert p.checked_at is None

    def test_all_patch_statuses(self) -> None:
        for st in PatchStatus:
            p = DevicePatchStatusCreate(
                device_id=uuid.uuid4(),
                update_id=uuid.uuid4(),
                status=st,
            )
            assert p.status == st

    def test_with_installed_at(self) -> None:
        ts = datetime.now(timezone.utc)
        p = DevicePatchStatusCreate(
            device_id=uuid.uuid4(),
            update_id=uuid.uuid4(),
            status=PatchStatus.installed,
            installed_at=ts,
        )
        assert p.installed_at == ts


# ---------------------------------------------------------------------------
# PatchComplianceSummary
# ---------------------------------------------------------------------------


class TestPatchComplianceSummary:
    def test_construction(self) -> None:
        s = PatchComplianceSummary(
            total_devices=100,
            total_updates=50,
            fully_patched_devices=80,
            compliance_rate=80.0,
            critical_missing=2,
            important_missing=5,
            moderate_missing=10,
            low_missing=3,
        )
        assert s.compliance_rate == 80.0
        assert s.critical_missing == 2

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            PatchComplianceSummary(total_devices=10)  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# VulnerabilityCreate
# ---------------------------------------------------------------------------


class TestVulnerabilityCreate:
    def test_basic_construction(self) -> None:
        v = VulnerabilityCreate(
            cve_id="CVE-2024-21338",
            title="Remote Code Execution",
            severity=VulnerabilitySeverity.critical,
            cvss_score=Decimal("9.8"),
            published_at=datetime.now(timezone.utc),
        )
        assert v.cve_id == "CVE-2024-21338"
        assert v.affected_software is None

    def test_all_vulnerability_severities(self) -> None:
        for sev in VulnerabilitySeverity:
            v = VulnerabilityCreate(
                cve_id="CVE-2024-00001",
                title="T",
                severity=sev,
                cvss_score=Decimal("5.0"),
                published_at=datetime.now(timezone.utc),
            )
            assert v.severity == sev

    def test_cvss_score_boundary_zero(self) -> None:
        v = VulnerabilityCreate(
            cve_id="CVE-2024-00002",
            title="T",
            severity=VulnerabilitySeverity.low,
            cvss_score=Decimal("0.0"),
            published_at=datetime.now(timezone.utc),
        )
        assert v.cvss_score == Decimal("0.0")

    def test_cvss_score_boundary_ten(self) -> None:
        v = VulnerabilityCreate(
            cve_id="CVE-2024-00003",
            title="T",
            severity=VulnerabilitySeverity.critical,
            cvss_score=Decimal("10.0"),
            published_at=datetime.now(timezone.utc),
        )
        assert v.cvss_score == Decimal("10.0")

    def test_cvss_score_over_ten_raises(self) -> None:
        with pytest.raises(ValidationError):
            VulnerabilityCreate(
                cve_id="CVE-2024-00004",
                title="T",
                severity=VulnerabilitySeverity.critical,
                cvss_score=Decimal("10.1"),
                published_at=datetime.now(timezone.utc),
            )

    def test_cvss_score_negative_raises(self) -> None:
        with pytest.raises(ValidationError):
            VulnerabilityCreate(
                cve_id="CVE-2024-00005",
                title="T",
                severity=VulnerabilitySeverity.low,
                cvss_score=Decimal("-0.1"),
                published_at=datetime.now(timezone.utc),
            )

    def test_cve_id_max_50(self) -> None:
        VulnerabilityCreate(
            cve_id="C" * 50,
            title="T",
            severity=VulnerabilitySeverity.high,
            cvss_score=Decimal("7.5"),
            published_at=datetime.now(timezone.utc),
        )

    def test_cve_id_over_50_raises(self) -> None:
        with pytest.raises(ValidationError):
            VulnerabilityCreate(
                cve_id="C" * 51,
                title="T",
                severity=VulnerabilitySeverity.high,
                cvss_score=Decimal("7.5"),
                published_at=datetime.now(timezone.utc),
            )


# ---------------------------------------------------------------------------
# NotificationChannelCreate
# ---------------------------------------------------------------------------


class TestNotificationChannelCreate:
    def test_defaults(self) -> None:
        c = NotificationChannelCreate(
            name="Email Alert",
            channel_type=ChannelType.email,
        )
        assert c.is_enabled is True
        assert c.config == {}

    def test_all_channel_types(self) -> None:
        for ct in ChannelType:
            c = NotificationChannelCreate(name="ch", channel_type=ct)
            assert c.channel_type == ct

    def test_with_config(self) -> None:
        c = NotificationChannelCreate(
            name="Slack",
            channel_type=ChannelType.slack,
            config={"webhook_url": "https://hooks.slack.com/test"},
        )
        assert "webhook_url" in c.config

    def test_disabled_channel(self) -> None:
        c = NotificationChannelCreate(
            name="Teams", channel_type=ChannelType.teams, is_enabled=False
        )
        assert c.is_enabled is False


# ---------------------------------------------------------------------------
# NotificationChannelUpdate
# ---------------------------------------------------------------------------


class TestNotificationChannelUpdate:
    def test_all_optional(self) -> None:
        u = NotificationChannelUpdate()
        assert u.name is None
        assert u.config is None
        assert u.is_enabled is None

    def test_partial_update(self) -> None:
        u = NotificationChannelUpdate(is_enabled=False)
        assert u.is_enabled is False
        assert u.name is None


# ---------------------------------------------------------------------------
# NotificationChannelTestResult
# ---------------------------------------------------------------------------


class TestNotificationChannelTestResult:
    def test_success_result(self) -> None:
        r = NotificationChannelTestResult(success=True, message="OK")
        assert r.success is True

    def test_failure_result(self) -> None:
        r = NotificationChannelTestResult(success=False, message="Connection refused")
        assert r.success is False
        assert "refused" in r.message


# ---------------------------------------------------------------------------
# NotificationRuleCreate
# ---------------------------------------------------------------------------


class TestNotificationRuleCreate:
    def test_basic_construction(self) -> None:
        r = NotificationRuleCreate(
            name="Critical Alert Rule",
            event_type=NotificationEventType.alert_critical,
            channel_id=uuid.uuid4(),
        )
        assert r.is_enabled is True
        assert r.conditions is None

    def test_all_event_types(self) -> None:
        for et in NotificationEventType:
            r = NotificationRuleCreate(
                name="rule",
                event_type=et,
                channel_id=uuid.uuid4(),
            )
            assert r.event_type == et

    def test_with_conditions(self) -> None:
        r = NotificationRuleCreate(
            name="License Rule",
            event_type=NotificationEventType.license_violation,
            channel_id=uuid.uuid4(),
            conditions={"severity": "critical"},
        )
        assert r.conditions["severity"] == "critical"


# ---------------------------------------------------------------------------
# NotificationRuleUpdate
# ---------------------------------------------------------------------------


class TestNotificationRuleUpdate:
    def test_all_optional(self) -> None:
        u = NotificationRuleUpdate()
        assert u.name is None
        assert u.event_type is None
        assert u.channel_id is None

    def test_partial_update(self) -> None:
        u = NotificationRuleUpdate(is_enabled=False)
        assert u.is_enabled is False


# ---------------------------------------------------------------------------
# NetworkScanEntry
# ---------------------------------------------------------------------------


class TestNetworkScanEntry:
    def test_defaults(self) -> None:
        e = NetworkScanEntry(ip_address="192.168.1.1", mac_address="AA:BB:CC:DD:EE:FF")
        assert e.hostname is None
        assert e.device_type == NetworkDeviceType.unknown

    def test_all_device_types(self) -> None:
        for dt in NetworkDeviceType:
            e = NetworkScanEntry(ip_address="10.0.0.1", mac_address="00:00:00:00:00:01", device_type=dt)
            assert e.device_type == dt

    def test_with_hostname(self) -> None:
        e = NetworkScanEntry(
            ip_address="10.0.0.5",
            mac_address="00:11:22:33:44:55",
            hostname="pc-alice",
        )
        assert e.hostname == "pc-alice"


# ---------------------------------------------------------------------------
# NetworkScanRequest
# ---------------------------------------------------------------------------


class TestNetworkScanRequest:
    def test_empty_devices(self) -> None:
        r = NetworkScanRequest(devices=[])
        assert r.devices == []

    def test_with_devices(self) -> None:
        entry = NetworkScanEntry(ip_address="192.168.0.1", mac_address="AA:BB:CC:DD:EE:FF")
        r = NetworkScanRequest(devices=[entry])
        assert len(r.devices) == 1

    def test_missing_devices_raises(self) -> None:
        with pytest.raises(ValidationError):
            NetworkScanRequest()  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# NetworkScanResponse
# ---------------------------------------------------------------------------


class TestNetworkScanResponse:
    def test_construction(self) -> None:
        r = NetworkScanResponse(created=5, updated=3)
        assert r.created == 5
        assert r.updated == 3


# ---------------------------------------------------------------------------
# NetworkDeviceLinkRequest
# ---------------------------------------------------------------------------


class TestNetworkDeviceLinkRequest:
    def test_construction(self) -> None:
        uid = uuid.uuid4()
        r = NetworkDeviceLinkRequest(device_id=uid)
        assert r.device_id == uid

    def test_invalid_uuid_raises(self) -> None:
        with pytest.raises(ValidationError):
            NetworkDeviceLinkRequest(device_id="not-a-uuid")
