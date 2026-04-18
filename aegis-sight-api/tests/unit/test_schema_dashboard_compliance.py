"""Unit tests for dashboard and compliance Pydantic schemas — pure model logic."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.compliance import (
    AuditEvent,
    ComplianceIssue,
    ComplianceOverviewResponse,
    ISO27001Category,
    ISO27001Response,
    JSOXControl,
    JSOXResponse,
    NISTFunction,
    NISTResponse,
)
from app.schemas.dashboard import AlertItem, AlertListResponse, DashboardStats

# ---------------------------------------------------------------------------
# DashboardStats
# ---------------------------------------------------------------------------


class TestDashboardStats:
    def test_defaults_all_zero(self) -> None:
        s = DashboardStats()
        assert s.total_devices == 0
        assert s.online_devices == 0
        assert s.total_licenses == 0
        assert s.compliance_rate == 0.0
        assert s.pending_procurements == 0
        assert s.active_alerts == 0

    def test_accepts_custom_values(self) -> None:
        s = DashboardStats(
            total_devices=10,
            online_devices=8,
            total_licenses=20,
            compliance_rate=0.85,
            pending_procurements=3,
            active_alerts=2,
        )
        assert s.total_devices == 10
        assert s.compliance_rate == 0.85

    def test_compliance_rate_is_float(self) -> None:
        s = DashboardStats(compliance_rate=1)
        assert isinstance(s.compliance_rate, float)

    def test_field_names(self) -> None:
        fields = set(DashboardStats.model_fields.keys())
        assert fields == {
            "total_devices",
            "online_devices",
            "total_licenses",
            "compliance_rate",
            "pending_procurements",
            "active_alerts",
        }


# ---------------------------------------------------------------------------
# AlertItem
# ---------------------------------------------------------------------------


class TestAlertItem:
    def _make(self, **kwargs) -> AlertItem:
        base = {
            "id": "alert-1",
            "severity": "high",
            "title": "Test Alert",
            "description": "Something happened",
            "created_at": datetime(2026, 1, 1, tzinfo=UTC),
        }
        base.update(kwargs)
        return AlertItem(**base)

    def test_required_fields_accepted(self) -> None:
        item = self._make()
        assert item.id == "alert-1"
        assert item.severity == "high"

    def test_device_hostname_defaults_to_none(self) -> None:
        item = self._make()
        assert item.device_hostname is None

    def test_device_hostname_can_be_set(self) -> None:
        item = self._make(device_hostname="PC-001")
        assert item.device_hostname == "PC-001"

    def test_missing_id_raises(self) -> None:
        with pytest.raises(ValidationError):
            AlertItem(
                severity="high",
                title="t",
                description="d",
                created_at=datetime.now(),
            )

    def test_missing_created_at_raises(self) -> None:
        with pytest.raises(ValidationError):
            AlertItem(id="x", severity="high", title="t", description="d")

    def test_from_attributes_enabled(self) -> None:
        assert AlertItem.model_config.get("from_attributes") is True

    def test_from_orm_like_object(self) -> None:
        class FakeAlert:
            id = "orm-1"
            severity = "low"
            title = "ORM Alert"
            description = "from orm"
            device_hostname = "HOST-A"
            created_at = datetime(2026, 3, 1, tzinfo=UTC)

        item = AlertItem.model_validate(FakeAlert())
        assert item.id == "orm-1"
        assert item.device_hostname == "HOST-A"


# ---------------------------------------------------------------------------
# AlertListResponse
# ---------------------------------------------------------------------------


class TestAlertListResponse:
    def test_defaults_empty(self) -> None:
        r = AlertListResponse()
        assert r.alerts == []
        assert r.total == 0

    def test_accepts_alert_items(self) -> None:
        now = datetime.now(tz=UTC)
        item = AlertItem(id="a1", severity="medium", title="T", description="D", created_at=now)
        r = AlertListResponse(alerts=[item], total=1)
        assert len(r.alerts) == 1
        assert r.total == 1

    def test_total_independent_of_alerts_length(self) -> None:
        r = AlertListResponse(alerts=[], total=99)
        assert r.total == 99


# ---------------------------------------------------------------------------
# ISO27001Category
# ---------------------------------------------------------------------------


class TestISO27001Category:
    def test_basic_construction(self) -> None:
        c = ISO27001Category(name="Access Control", score=4.5, max_score=5.0, status="compliant")
        assert c.name == "Access Control"
        assert c.score == 4.5
        assert c.status == "compliant"

    def test_partial_status(self) -> None:
        c = ISO27001Category(name="Crypto", score=2.0, max_score=5.0, status="partial")
        assert c.status == "partial"


# ---------------------------------------------------------------------------
# ISO27001Response
# ---------------------------------------------------------------------------


class TestISO27001Response:
    def test_construction_with_categories(self) -> None:
        cat = ISO27001Category(name="A.5", score=4.0, max_score=5.0, status="compliant")
        r = ISO27001Response(
            overall_score=80.0,
            categories=[cat],
            last_assessment="2026-01-01",
            next_review="2027-01-01",
        )
        assert r.overall_score == 80.0
        assert len(r.categories) == 1

    def test_empty_categories(self) -> None:
        r = ISO27001Response(
            overall_score=0.0, categories=[], last_assessment="2026-01-01", next_review="2027-01-01"
        )
        assert r.categories == []


# ---------------------------------------------------------------------------
# JSOXControl
# ---------------------------------------------------------------------------


class TestJSOXControl:
    def test_basic(self) -> None:
        c = JSOXControl(area="Change Mgmt", status="effective", findings=0, remediation_progress=1.0)
        assert c.area == "Change Mgmt"
        assert c.findings == 0

    def test_findings_can_be_nonzero(self) -> None:
        c = JSOXControl(area="Access", status="partially_effective", findings=3, remediation_progress=0.5)
        assert c.findings == 3
        assert c.remediation_progress == 0.5


# ---------------------------------------------------------------------------
# JSOXResponse
# ---------------------------------------------------------------------------


class TestJSOXResponse:
    def test_construction(self) -> None:
        ctrl = JSOXControl(area="A", status="effective", findings=0, remediation_progress=1.0)
        r = JSOXResponse(
            overall_status="effective",
            controls=[ctrl],
            audit_period="FY2025",
            last_tested="2025-12-31",
        )
        assert r.overall_status == "effective"
        assert len(r.controls) == 1


# ---------------------------------------------------------------------------
# NISTFunction
# ---------------------------------------------------------------------------


class TestNISTFunction:
    def test_basic(self) -> None:
        f = NISTFunction(function="Identify", tier=3, target_tier=4, score=60.0, max_score=100.0)
        assert f.function == "Identify"
        assert f.tier == 3

    def test_tier_range(self) -> None:
        for tier in [1, 2, 3, 4]:
            f = NISTFunction(function="X", tier=tier, target_tier=4, score=0.0, max_score=100.0)
            assert f.tier == tier


# ---------------------------------------------------------------------------
# NISTResponse
# ---------------------------------------------------------------------------


class TestNISTResponse:
    def test_construction(self) -> None:
        fn = NISTFunction(function="Protect", tier=2, target_tier=3, score=40.0, max_score=100.0)
        r = NISTResponse(overall_tier=2.4, functions=[fn], last_assessment="2026-01-01")
        assert r.overall_tier == 2.4
        assert len(r.functions) == 1


# ---------------------------------------------------------------------------
# ComplianceIssue
# ---------------------------------------------------------------------------


class TestComplianceIssue:
    def test_due_date_defaults_to_none(self) -> None:
        issue = ComplianceIssue(id="i1", framework="ISO27001", severity="high", title="T", status="open")
        assert issue.due_date is None

    def test_due_date_can_be_set(self) -> None:
        issue = ComplianceIssue(
            id="i1", framework="NIST", severity="medium", title="T", status="open", due_date="2026-06-30"
        )
        assert issue.due_date == "2026-06-30"

    def test_required_fields(self) -> None:
        with pytest.raises(ValidationError):
            ComplianceIssue(framework="X", severity="low", title="T", status="open")


# ---------------------------------------------------------------------------
# AuditEvent
# ---------------------------------------------------------------------------


class TestAuditEvent:
    def test_construction(self) -> None:
        e = AuditEvent(
            timestamp="2026-01-01T00:00:00Z",
            event_type="login",
            description="Admin logged in",
            actor="admin@example.com",
        )
        assert e.event_type == "login"
        assert e.actor == "admin@example.com"

    def test_missing_actor_raises(self) -> None:
        with pytest.raises(ValidationError):
            AuditEvent(timestamp="2026-01-01T00:00:00Z", event_type="login", description="D")


# ---------------------------------------------------------------------------
# ComplianceOverviewResponse
# ---------------------------------------------------------------------------


class TestComplianceOverviewResponse:
    def _make_event(self) -> AuditEvent:
        return AuditEvent(
            timestamp="2026-01-01T00:00:00Z", event_type="review", description="D", actor="a@b.com"
        )

    def _make_issue(self) -> ComplianceIssue:
        return ComplianceIssue(id="i1", framework="ISO", severity="low", title="T", status="open")

    def test_construction(self) -> None:
        r = ComplianceOverviewResponse(
            iso27001_score=75.0,
            jsox_status="effective",
            nist_tier=2.5,
            open_issues=3,
            recent_events=[self._make_event()],
            issues=[self._make_issue()],
        )
        assert r.iso27001_score == 75.0
        assert r.open_issues == 3

    def test_empty_lists(self) -> None:
        r = ComplianceOverviewResponse(
            iso27001_score=0.0,
            jsox_status="unknown",
            nist_tier=0.0,
            open_issues=0,
            recent_events=[],
            issues=[],
        )
        assert r.recent_events == []
        assert r.issues == []

    def test_nist_tier_is_float(self) -> None:
        r = ComplianceOverviewResponse(
            iso27001_score=50.0,
            jsox_status="ok",
            nist_tier=3,
            open_issues=0,
            recent_events=[],
            issues=[],
        )
        assert isinstance(r.nist_tier, float)
