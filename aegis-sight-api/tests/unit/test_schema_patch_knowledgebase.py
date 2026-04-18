"""Unit tests for patch and knowledge_base Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.knowledge_base import ArticleCategory, ArticleStatus
from app.models.patch import PatchStatus, UpdateSeverity, VulnerabilitySeverity
from app.schemas.knowledge_base import (
    HelpfulResponse,
    KBArticleCreate,
    KBArticleUpdate,
    KBCategoryCreate,
)
from app.schemas.patch import (
    DevicePatchStatusCreate,
    MissingPatchEntry,
    PatchComplianceSummary,
    VulnerabilityCreate,
    WindowsUpdateCreate,
)

# ---------------------------------------------------------------------------
# WindowsUpdateCreate
# ---------------------------------------------------------------------------


class TestWindowsUpdateCreate:
    def test_basic_construction(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        u = WindowsUpdateCreate(
            kb_number="KB5034763",
            title="Security Update",
            severity=UpdateSeverity.critical,
            release_date=now,
        )
        assert u.kb_number == "KB5034763"
        assert u.description is None

    def test_all_severities(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        for sev in UpdateSeverity:
            u = WindowsUpdateCreate(
                kb_number="KB0000001",
                title="T",
                severity=sev,
                release_date=now,
            )
            assert u.severity == sev

    def test_kb_number_max_50(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        WindowsUpdateCreate(
            kb_number="K" * 50, title="T", severity=UpdateSeverity.low, release_date=now
        )

    def test_kb_number_over_50_raises(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        with pytest.raises(ValidationError):
            WindowsUpdateCreate(
                kb_number="K" * 51, title="T", severity=UpdateSeverity.low, release_date=now
            )

    def test_with_description(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        u = WindowsUpdateCreate(
            kb_number="KB123",
            title="T",
            severity=UpdateSeverity.important,
            release_date=now,
            description="Fixes RCE vulnerability",
        )
        assert u.description == "Fixes RCE vulnerability"


# ---------------------------------------------------------------------------
# DevicePatchStatusCreate
# ---------------------------------------------------------------------------


class TestDevicePatchStatusCreate:
    def test_defaults(self) -> None:
        s = DevicePatchStatusCreate(
            device_id=uuid.uuid4(),
            update_id=uuid.uuid4(),
        )
        assert s.status == PatchStatus.not_installed
        assert s.installed_at is None
        assert s.checked_at is None

    def test_all_statuses(self) -> None:
        dev = uuid.uuid4()
        upd = uuid.uuid4()
        for st in PatchStatus:
            s = DevicePatchStatusCreate(device_id=dev, update_id=upd, status=st)
            assert s.status == st

    def test_with_timestamps(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        s = DevicePatchStatusCreate(
            device_id=uuid.uuid4(),
            update_id=uuid.uuid4(),
            status=PatchStatus.installed,
            installed_at=now,
            checked_at=now,
        )
        assert s.installed_at == now


# ---------------------------------------------------------------------------
# PatchComplianceSummary
# ---------------------------------------------------------------------------


class TestPatchComplianceSummary:
    def test_construction(self) -> None:
        s = PatchComplianceSummary(
            total_devices=100,
            total_updates=200,
            fully_patched_devices=80,
            compliance_rate=80.0,
            critical_missing=2,
            important_missing=5,
            moderate_missing=10,
            low_missing=3,
        )
        assert s.compliance_rate == 80.0
        assert s.total_devices == 100

    def test_zero_values(self) -> None:
        s = PatchComplianceSummary(
            total_devices=0,
            total_updates=0,
            fully_patched_devices=0,
            compliance_rate=100.0,
            critical_missing=0,
            important_missing=0,
            moderate_missing=0,
            low_missing=0,
        )
        assert s.compliance_rate == 100.0


# ---------------------------------------------------------------------------
# MissingPatchEntry
# ---------------------------------------------------------------------------


class TestMissingPatchEntry:
    def test_construction(self) -> None:
        entry = MissingPatchEntry(
            update_id=uuid.uuid4(),
            kb_number="KB5034763",
            title="Critical Patch",
            severity=UpdateSeverity.critical,
            release_date=datetime(2026, 1, 1, tzinfo=UTC),
            missing_device_count=15,
        )
        assert entry.missing_device_count == 15
        assert entry.severity == UpdateSeverity.critical


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
            published_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
        assert v.cve_id == "CVE-2024-21338"
        assert v.affected_software is None
        assert v.remediation is None

    def test_all_vuln_severities(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        for sev in VulnerabilitySeverity:
            v = VulnerabilityCreate(
                cve_id="CVE-0000-00000",
                title="T",
                severity=sev,
                cvss_score=Decimal("5.0"),
                published_at=now,
            )
            assert v.severity == sev

    def test_cvss_score_boundary(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        VulnerabilityCreate(
            cve_id="CVE-X",
            title="T",
            severity=VulnerabilitySeverity.low,
            cvss_score=Decimal("0.0"),
            published_at=now,
        )
        VulnerabilityCreate(
            cve_id="CVE-Y",
            title="T",
            severity=VulnerabilitySeverity.critical,
            cvss_score=Decimal("10.0"),
            published_at=now,
        )

    def test_cvss_score_out_of_range_raises(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        with pytest.raises(ValidationError):
            VulnerabilityCreate(
                cve_id="CVE-X",
                title="T",
                severity=VulnerabilitySeverity.low,
                cvss_score=Decimal("10.1"),
                published_at=now,
            )

    def test_negative_cvss_raises(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        with pytest.raises(ValidationError):
            VulnerabilityCreate(
                cve_id="CVE-X",
                title="T",
                severity=VulnerabilitySeverity.low,
                cvss_score=Decimal("-0.1"),
                published_at=now,
            )

    def test_with_affected_software(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=UTC)
        v = VulnerabilityCreate(
            cve_id="CVE-2024-001",
            title="RCE",
            severity=VulnerabilitySeverity.high,
            cvss_score=Decimal("8.1"),
            affected_software={"product": "Windows 11", "version": "22H2"},
            published_at=now,
        )
        assert v.affected_software["product"] == "Windows 11"


# ---------------------------------------------------------------------------
# KBArticleCreate
# ---------------------------------------------------------------------------


class TestKBArticleCreate:
    def test_defaults(self) -> None:
        a = KBArticleCreate(
            title="How to reset password",
            content="Step 1...",
            category=ArticleCategory.how_to,
        )
        assert a.status == ArticleStatus.draft
        assert a.tags is None

    def test_all_categories(self) -> None:
        for cat in ArticleCategory:
            a = KBArticleCreate(title="T", content="C", category=cat)
            assert a.category == cat

    def test_all_statuses(self) -> None:
        for st in ArticleStatus:
            a = KBArticleCreate(
                title="T", content="C", category=ArticleCategory.faq, status=st
            )
            assert a.status == st

    def test_with_tags(self) -> None:
        a = KBArticleCreate(
            title="T",
            content="C",
            category=ArticleCategory.troubleshooting,
            tags=["network", "vpn"],
        )
        assert len(a.tags) == 2


# ---------------------------------------------------------------------------
# KBArticleUpdate
# ---------------------------------------------------------------------------


class TestKBArticleUpdate:
    def test_all_optional(self) -> None:
        u = KBArticleUpdate()
        assert u.title is None
        assert u.content is None
        assert u.category is None
        assert u.status is None

    def test_partial_update(self) -> None:
        u = KBArticleUpdate(title="Updated Title", status=ArticleStatus.published)
        assert u.title == "Updated Title"
        assert u.status == ArticleStatus.published


# ---------------------------------------------------------------------------
# KBCategoryCreate
# ---------------------------------------------------------------------------


class TestKBCategoryCreate:
    def test_defaults(self) -> None:
        c = KBCategoryCreate(name="Networking", description="Network-related articles")
        assert c.icon is None
        assert c.sort_order == 0
        assert c.parent_id is None

    def test_with_parent(self) -> None:
        parent = uuid.uuid4()
        c = KBCategoryCreate(
            name="Sub",
            description="Subcategory",
            parent_id=parent,
            sort_order=5,
        )
        assert c.parent_id == parent
        assert c.sort_order == 5


# ---------------------------------------------------------------------------
# HelpfulResponse
# ---------------------------------------------------------------------------


class TestHelpfulResponse:
    def test_construction(self) -> None:
        r = HelpfulResponse(helpful_count=42)
        assert r.helpful_count == 42

    def test_zero_count(self) -> None:
        r = HelpfulResponse(helpful_count=0)
        assert r.helpful_count == 0
