"""Unit tests for incident and policy Pydantic schemas."""

from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.models.incident import (
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    IndicatorType,
    ThreatLevel,
)
from app.models.policy import PolicyType
from app.schemas.incident import (
    IncidentCreate,
    IncidentResolve,
    IncidentStats,
    IncidentUpdate,
    ThreatIndicatorCreate,
    TimelineEntry,
)
from app.schemas.policy import (
    DevicePolicyCreate,
    DevicePolicyUpdate,
    PolicyComplianceSummary,
    PolicyEvaluateRequest,
    PolicyEvaluateResponse,
)

# ---------------------------------------------------------------------------
# IncidentCreate
# ---------------------------------------------------------------------------


class TestIncidentCreate:
    def test_basic_construction(self) -> None:
        ic = IncidentCreate(
            title="Malware detected",
            description="Ransomware on PC-001",
            severity=IncidentSeverity.P1_critical,
            category=IncidentCategory.malware,
        )
        assert ic.title == "Malware detected"
        assert ic.affected_devices is None
        assert ic.detected_at is None

    def test_with_affected_devices(self) -> None:
        ic = IncidentCreate(
            title="Breach",
            description="Unauthorized access",
            severity=IncidentSeverity.P2_high,
            category=IncidentCategory.unauthorized_access,
            affected_devices=["PC-001", "PC-002"],
        )
        assert len(ic.affected_devices) == 2

    def test_required_fields_missing_raises(self) -> None:
        with pytest.raises(ValidationError):
            IncidentCreate(title="T", description="D")


# ---------------------------------------------------------------------------
# IncidentUpdate
# ---------------------------------------------------------------------------


class TestIncidentUpdate:
    def test_all_fields_optional(self) -> None:
        u = IncidentUpdate()
        assert u.title is None
        assert u.status is None
        assert u.root_cause is None

    def test_partial_update(self) -> None:
        u = IncidentUpdate(status=IncidentStatus.resolved, root_cause="Config error")
        assert u.status == IncidentStatus.resolved
        assert u.root_cause == "Config error"

    def test_all_statuses_valid(self) -> None:
        for st in IncidentStatus:
            u = IncidentUpdate(status=st)
            assert u.status == st


# ---------------------------------------------------------------------------
# TimelineEntry
# ---------------------------------------------------------------------------


class TestTimelineEntry:
    def test_details_optional(self) -> None:
        e = TimelineEntry(event="Initial detection")
        assert e.details is None

    def test_with_details(self) -> None:
        e = TimelineEntry(event="Contained", details="Isolated from network")
        assert e.details == "Isolated from network"


# ---------------------------------------------------------------------------
# IncidentResolve
# ---------------------------------------------------------------------------


class TestIncidentResolve:
    def test_required_fields(self) -> None:
        r = IncidentResolve(root_cause="Phishing email", resolution="Quarantined device")
        assert r.root_cause == "Phishing email"
        assert r.lessons_learned is None

    def test_with_lessons_learned(self) -> None:
        r = IncidentResolve(
            root_cause="Weak password",
            resolution="Password reset",
            lessons_learned="Enforce MFA",
        )
        assert r.lessons_learned == "Enforce MFA"

    def test_missing_root_cause_raises(self) -> None:
        with pytest.raises(ValidationError):
            IncidentResolve(resolution="Fixed")


# ---------------------------------------------------------------------------
# IncidentStats
# ---------------------------------------------------------------------------


class TestIncidentStats:
    def test_construction(self) -> None:
        s = IncidentStats(
            total=20,
            p1_critical=2,
            p2_high=5,
            p3_medium=8,
            p4_low=5,
            open_incidents=10,
            resolved_incidents=10,
            mttr_hours=None,
        )
        assert s.total == 20
        assert s.mttr_hours is None

    def test_with_mttr(self) -> None:
        s = IncidentStats(
            total=5, p1_critical=1, p2_high=2, p3_medium=1, p4_low=1,
            open_incidents=2, resolved_incidents=3, mttr_hours=4.5,
        )
        assert s.mttr_hours == 4.5


# ---------------------------------------------------------------------------
# ThreatIndicatorCreate
# ---------------------------------------------------------------------------


class TestThreatIndicatorCreate:
    def test_all_indicator_types(self) -> None:
        for itype in IndicatorType:
            ti = ThreatIndicatorCreate(
                indicator_type=itype,
                value="test-value",
                threat_level=ThreatLevel.high,
                source="SIEM",
                description="Test threat",
            )
            assert ti.indicator_type == itype

    def test_related_incidents_defaults_none(self) -> None:
        ti = ThreatIndicatorCreate(
            indicator_type=IndicatorType.ip_address,
            value="1.2.3.4",
            threat_level=ThreatLevel.critical,
            source="Manual",
            description="Known bad IP",
        )
        assert ti.related_incidents is None


# ---------------------------------------------------------------------------
# DevicePolicyCreate
# ---------------------------------------------------------------------------


class TestDevicePolicyCreate:
    def test_defaults(self) -> None:
        p = DevicePolicyCreate(
            name="USB Policy",
            policy_type=PolicyType.usb_control,
        )
        assert p.is_enabled is True
        assert p.priority == 0
        assert p.rules is None

    def test_negative_priority_raises(self) -> None:
        with pytest.raises(ValidationError):
            DevicePolicyCreate(
                name="P", policy_type=PolicyType.patch_requirement, priority=-1
            )

    def test_name_max_255(self) -> None:
        DevicePolicyCreate(name="x" * 255, policy_type=PolicyType.security_baseline)

    def test_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            DevicePolicyCreate(name="x" * 256, policy_type=PolicyType.usb_control)

    def test_all_policy_types(self) -> None:
        for pt in PolicyType:
            p = DevicePolicyCreate(name="P", policy_type=pt)
            assert p.policy_type == pt


# ---------------------------------------------------------------------------
# DevicePolicyUpdate
# ---------------------------------------------------------------------------


class TestDevicePolicyUpdate:
    def test_all_optional(self) -> None:
        u = DevicePolicyUpdate()
        assert u.name is None
        assert u.priority is None
        assert u.is_enabled is None

    def test_negative_priority_raises(self) -> None:
        with pytest.raises(ValidationError):
            DevicePolicyUpdate(priority=-1)


# ---------------------------------------------------------------------------
# PolicyComplianceSummary
# ---------------------------------------------------------------------------


class TestPolicyComplianceSummary:
    def test_construction(self) -> None:
        s = PolicyComplianceSummary(
            total_policies=10,
            enabled_policies=8,
            total_violations=5,
            unresolved_violations=2,
            compliance_rate=80.0,
        )
        assert s.compliance_rate == 80.0
        assert s.by_type == {}

    def test_by_type_populated(self) -> None:
        s = PolicyComplianceSummary(
            total_policies=3,
            enabled_policies=3,
            total_violations=2,
            unresolved_violations=1,
            compliance_rate=66.7,
            by_type={"usb_control": 1, "patch_requirement": 1},
        )
        assert s.by_type["usb_control"] == 1


# ---------------------------------------------------------------------------
# PolicyEvaluateRequest
# ---------------------------------------------------------------------------


class TestPolicyEvaluateRequest:
    def test_all_optional(self) -> None:
        r = PolicyEvaluateRequest()
        assert r.policy_ids is None
        assert r.device_ids is None

    def test_with_ids(self) -> None:
        uid = uuid.uuid4()
        r = PolicyEvaluateRequest(policy_ids=[uid], device_ids=[uid])
        assert len(r.policy_ids) == 1


# ---------------------------------------------------------------------------
# PolicyEvaluateResponse
# ---------------------------------------------------------------------------


class TestPolicyEvaluateResponse:
    def test_construction(self) -> None:
        r = PolicyEvaluateResponse(
            evaluated_policies=5, evaluated_devices=100, new_violations=3
        )
        assert r.new_violations == 3
