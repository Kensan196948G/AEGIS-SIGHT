"""Unit tests for asset_lifecycle, dlp, and device_group Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from pydantic import ValidationError

from app.models.asset_lifecycle import (
    DisposalMethod,
    LifecycleEventType,
)
from app.models.dlp import DLPAction, DLPRuleType, DLPSeverity
from app.schemas.asset_lifecycle import (
    DisposalCompletePayload,
    DisposalRequestCreate,
    LifecycleEventCreate,
    LifecycleSummary,
)
from app.schemas.device_group import (
    DeviceGroupCreate,
    DeviceGroupUpdate,
    MemberAddRequest,
)
from app.schemas.dlp import (
    DLPEvaluateRequest,
    DLPEvaluateResult,
    DLPEventSummary,
    DLPRuleCreate,
    DLPRuleUpdate,
)

# ---------------------------------------------------------------------------
# LifecycleEventCreate
# ---------------------------------------------------------------------------


class TestLifecycleEventCreate:
    def test_all_event_types(self) -> None:
        for et in LifecycleEventType:
            e = LifecycleEventCreate(event_type=et)
            assert e.event_type == et

    def test_detail_optional(self) -> None:
        e = LifecycleEventCreate(event_type=LifecycleEventType.deployed)
        assert e.detail is None

    def test_detail_with_dict(self) -> None:
        e = LifecycleEventCreate(
            event_type=LifecycleEventType.maintenance,
            detail={"note": "scheduled maintenance", "technician": "alice"},
        )
        assert e.detail["note"] == "scheduled maintenance"

    def test_missing_event_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            LifecycleEventCreate()  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# DisposalRequestCreate
# ---------------------------------------------------------------------------


class TestDisposalRequestCreate:
    def test_basic_construction(self) -> None:
        r = DisposalRequestCreate(
            device_id=uuid.uuid4(),
            reason="End of life",
            method=DisposalMethod.recycle,
        )
        assert r.method == DisposalMethod.recycle
        assert r.reason == "End of life"

    def test_all_disposal_methods(self) -> None:
        did = uuid.uuid4()
        for m in DisposalMethod:
            r = DisposalRequestCreate(device_id=did, reason="reason", method=m)
            assert r.method == m

    def test_missing_device_id_raises(self) -> None:
        with pytest.raises(ValidationError):
            DisposalRequestCreate(reason="reason", method=DisposalMethod.destroy)  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# DisposalCompletePayload
# ---------------------------------------------------------------------------


class TestDisposalCompletePayload:
    def test_required_fields(self) -> None:
        p = DisposalCompletePayload(certificate_number="CERT-001")
        assert p.certificate_number == "CERT-001"
        assert p.certificate_path is None
        assert p.disposal_date is None

    def test_with_all_fields(self) -> None:
        p = DisposalCompletePayload(
            certificate_number="CERT-002",
            certificate_path="/certs/CERT-002.pdf",
            disposal_date=date(2026, 3, 1),
        )
        assert p.disposal_date == date(2026, 3, 1)
        assert p.certificate_path == "/certs/CERT-002.pdf"

    def test_missing_certificate_number_raises(self) -> None:
        with pytest.raises(ValidationError):
            DisposalCompletePayload()  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# LifecycleSummary
# ---------------------------------------------------------------------------


class TestLifecycleSummary:
    def test_all_defaults_zero(self) -> None:
        s = LifecycleSummary()
        assert s.procured == 0
        assert s.deployed == 0
        assert s.maintenance == 0
        assert s.disposed == 0
        assert s.disposal_pending == 0
        assert s.disposal_approved == 0
        assert s.total_events == 0

    def test_with_values(self) -> None:
        s = LifecycleSummary(procured=10, deployed=8, disposed=2, total_events=50)
        assert s.procured == 10
        assert s.total_events == 50


# ---------------------------------------------------------------------------
# DLPRuleCreate
# ---------------------------------------------------------------------------


class TestDLPRuleCreate:
    def test_basic_construction(self) -> None:
        r = DLPRuleCreate(
            name="Block .exe",
            rule_type=DLPRuleType.file_extension,
            pattern=r"\.exe$",
            action=DLPAction.block,
            severity=DLPSeverity.high,
        )
        assert r.is_enabled is True
        assert r.description is None

    def test_all_rule_types(self) -> None:
        for rt in DLPRuleType:
            r = DLPRuleCreate(
                name="rule",
                rule_type=rt,
                pattern=".*",
                action=DLPAction.log,
                severity=DLPSeverity.low,
            )
            assert r.rule_type == rt

    def test_all_actions(self) -> None:
        for action in DLPAction:
            r = DLPRuleCreate(
                name="rule",
                rule_type=DLPRuleType.content_keyword,
                pattern="secret",
                action=action,
                severity=DLPSeverity.medium,
            )
            assert r.action == action

    def test_all_severities(self) -> None:
        for sev in DLPSeverity:
            r = DLPRuleCreate(
                name="rule",
                rule_type=DLPRuleType.path_pattern,
                pattern="/tmp/.*",
                action=DLPAction.alert,
                severity=sev,
            )
            assert r.severity == sev

    def test_name_max_255(self) -> None:
        DLPRuleCreate(
            name="x" * 255,
            rule_type=DLPRuleType.file_extension,
            pattern=".exe",
            action=DLPAction.block,
            severity=DLPSeverity.critical,
        )

    def test_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            DLPRuleCreate(
                name="x" * 256,
                rule_type=DLPRuleType.file_extension,
                pattern=".exe",
                action=DLPAction.block,
                severity=DLPSeverity.critical,
            )

    def test_pattern_max_1000(self) -> None:
        DLPRuleCreate(
            name="rule",
            rule_type=DLPRuleType.content_keyword,
            pattern="x" * 1000,
            action=DLPAction.log,
            severity=DLPSeverity.low,
        )

    def test_pattern_over_1000_raises(self) -> None:
        with pytest.raises(ValidationError):
            DLPRuleCreate(
                name="rule",
                rule_type=DLPRuleType.content_keyword,
                pattern="x" * 1001,
                action=DLPAction.log,
                severity=DLPSeverity.low,
            )


# ---------------------------------------------------------------------------
# DLPRuleUpdate
# ---------------------------------------------------------------------------


class TestDLPRuleUpdate:
    def test_all_optional(self) -> None:
        u = DLPRuleUpdate()
        assert u.name is None
        assert u.rule_type is None
        assert u.action is None
        assert u.severity is None
        assert u.is_enabled is None

    def test_partial_update(self) -> None:
        u = DLPRuleUpdate(is_enabled=False, severity=DLPSeverity.critical)
        assert u.is_enabled is False
        assert u.severity == DLPSeverity.critical


# ---------------------------------------------------------------------------
# DLPEvaluateRequest
# ---------------------------------------------------------------------------


class TestDLPEvaluateRequest:
    def test_required_fields(self) -> None:
        r = DLPEvaluateRequest(
            file_path="/home/user/docs/report.pdf",
            file_name="report.pdf",
            user_name="alice",
        )
        assert r.file_size is None
        assert r.device_id is None

    def test_with_all_fields(self) -> None:
        did = uuid.uuid4()
        r = DLPEvaluateRequest(
            file_path="/tmp/secret.exe",
            file_name="secret.exe",
            file_size=1024,
            user_name="bob",
            device_id=did,
        )
        assert r.file_size == 1024
        assert r.device_id == did


# ---------------------------------------------------------------------------
# DLPEvaluateResult
# ---------------------------------------------------------------------------


class TestDLPEvaluateResult:
    def test_no_match(self) -> None:
        r = DLPEvaluateResult(matched=False, actions=[], matched_rules=[], events_created=0)
        assert r.matched is False
        assert r.events_created == 0

    def test_match_with_actions(self) -> None:
        r = DLPEvaluateResult(
            matched=True,
            actions=[DLPAction.block, DLPAction.alert],
            matched_rules=[],
            events_created=1,
        )
        assert r.matched is True
        assert len(r.actions) == 2


# ---------------------------------------------------------------------------
# DLPEventSummary
# ---------------------------------------------------------------------------


class TestDLPEventSummary:
    def test_construction(self) -> None:
        s = DLPEventSummary(
            total_events=100,
            blocked=30,
            alerted=50,
            logged=20,
            by_severity={"critical": 10, "high": 20},
            by_rule_type={"file_extension": 30},
        )
        assert s.total_events == 100
        assert s.by_severity["critical"] == 10


# ---------------------------------------------------------------------------
# DeviceGroupCreate
# ---------------------------------------------------------------------------


class TestDeviceGroupCreate:
    def test_defaults(self) -> None:
        g = DeviceGroupCreate(name="Windows Laptops")
        assert g.description is None
        assert g.criteria is None
        assert g.is_dynamic is False

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValidationError):
            DeviceGroupCreate(name="")

    def test_name_max_200(self) -> None:
        DeviceGroupCreate(name="x" * 200)

    def test_name_over_200_raises(self) -> None:
        with pytest.raises(ValidationError):
            DeviceGroupCreate(name="x" * 201)

    def test_dynamic_group_with_criteria(self) -> None:
        g = DeviceGroupCreate(
            name="Online Windows",
            criteria={"os": "Windows", "status": "online"},
            is_dynamic=True,
        )
        assert g.is_dynamic is True
        assert g.criteria["os"] == "Windows"


# ---------------------------------------------------------------------------
# DeviceGroupUpdate
# ---------------------------------------------------------------------------


class TestDeviceGroupUpdate:
    def test_all_optional(self) -> None:
        u = DeviceGroupUpdate()
        assert u.name is None
        assert u.description is None
        assert u.criteria is None
        assert u.is_dynamic is None

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValidationError):
            DeviceGroupUpdate(name="")

    def test_partial_update(self) -> None:
        u = DeviceGroupUpdate(name="Updated Group", is_dynamic=True)
        assert u.name == "Updated Group"
        assert u.is_dynamic is True


# ---------------------------------------------------------------------------
# MemberAddRequest
# ---------------------------------------------------------------------------


class TestMemberAddRequest:
    def test_construction(self) -> None:
        did = uuid.uuid4()
        r = MemberAddRequest(device_id=did)
        assert r.device_id == did

    def test_missing_device_id_raises(self) -> None:
        with pytest.raises(ValidationError):
            MemberAddRequest()  # type: ignore[call-arg]
