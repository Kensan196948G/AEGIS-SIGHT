"""Unit tests for SLA and user session Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.sla import MeasurementPeriod, SLAMetricType
from app.models.user_session import ActivityType, SessionType
from app.schemas.sla import (
    SLADashboard,
    SLADashboardItem,
    SLADefinitionCreate,
    SLADefinitionUpdate,
    SLAMeasurementCreate,
    SLAReportRow,
)
from app.schemas.user_session import (
    ActivityCreate,
    SessionAnalytics,
    SessionCreate,
    SessionEnd,
    UserBehaviorProfile,
)

# ---------------------------------------------------------------------------
# SLADefinitionCreate
# ---------------------------------------------------------------------------


class TestSLADefinitionCreate:
    def test_basic_construction(self) -> None:
        s = SLADefinitionCreate(
            name="Availability SLA",
            metric_type=SLAMetricType.availability,
            target_value=Decimal("99.9"),
            unit="%",
            measurement_period=MeasurementPeriod.monthly,
            warning_threshold=Decimal("99.0"),
        )
        assert s.name == "Availability SLA"
        assert s.is_active is True

    def test_description_defaults_to_none(self) -> None:
        s = SLADefinitionCreate(
            name="SLA",
            metric_type=SLAMetricType.response_time,
            target_value=Decimal("5.0"),
            unit="minutes",
            measurement_period=MeasurementPeriod.daily,
            warning_threshold=Decimal("4.0"),
        )
        assert s.description is None

    def test_is_active_can_be_false(self) -> None:
        s = SLADefinitionCreate(
            name="Old SLA",
            metric_type=SLAMetricType.patch_compliance,
            target_value=Decimal("90"),
            unit="%",
            measurement_period=MeasurementPeriod.weekly,
            warning_threshold=Decimal("85"),
            is_active=False,
        )
        assert s.is_active is False

    def test_required_fields_missing_raises(self) -> None:
        with pytest.raises(ValidationError):
            SLADefinitionCreate(name="SLA")


# ---------------------------------------------------------------------------
# SLADefinitionUpdate
# ---------------------------------------------------------------------------


class TestSLADefinitionUpdate:
    def test_all_fields_optional(self) -> None:
        u = SLADefinitionUpdate()
        assert u.name is None
        assert u.is_active is None
        assert u.metric_type is None

    def test_partial_update(self) -> None:
        u = SLADefinitionUpdate(name="Updated Name", is_active=False)
        assert u.name == "Updated Name"
        assert u.is_active is False


# ---------------------------------------------------------------------------
# SLAMeasurementCreate
# ---------------------------------------------------------------------------


class TestSLAMeasurementCreate:
    def test_basic_construction(self) -> None:
        m = SLAMeasurementCreate(
            sla_id=uuid.uuid4(),
            measured_value=Decimal("99.5"),
            target_value=Decimal("99.9"),
            is_met=False,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        assert m.is_met is False
        assert m.detail is None

    def test_detail_dict(self) -> None:
        m = SLAMeasurementCreate(
            sla_id=uuid.uuid4(),
            measured_value=Decimal("100"),
            target_value=Decimal("99.9"),
            is_met=True,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            detail={"note": "exceeded target"},
        )
        assert m.detail["note"] == "exceeded target"


# ---------------------------------------------------------------------------
# SLADashboardItem
# ---------------------------------------------------------------------------


class TestSLADashboardItem:
    def test_nullable_fields(self) -> None:
        item = SLADashboardItem(
            sla_id=uuid.uuid4(),
            name="Avail SLA",
            metric_type=SLAMetricType.availability,
            target_value=Decimal("99.9"),
            current_value=None,
            achievement_rate=None,
            is_met=None,
            measurement_period=MeasurementPeriod.monthly,
            total_measurements=0,
            met_count=0,
            violation_count=0,
        )
        assert item.current_value is None
        assert item.achievement_rate is None


# ---------------------------------------------------------------------------
# SLADashboard
# ---------------------------------------------------------------------------


class TestSLADashboard:
    def test_construction(self) -> None:
        d = SLADashboard(
            overall_achievement_rate=None,
            total_definitions=5,
            active_definitions=4,
            total_violations=2,
            items=[],
        )
        assert d.items == []
        assert d.overall_achievement_rate is None

    def test_with_rate(self) -> None:
        d = SLADashboard(
            overall_achievement_rate=95.5,
            total_definitions=3,
            active_definitions=3,
            total_violations=0,
            items=[],
        )
        assert d.overall_achievement_rate == 95.5


# ---------------------------------------------------------------------------
# SLAReportRow
# ---------------------------------------------------------------------------


class TestSLAReportRow:
    def test_construction(self) -> None:
        row = SLAReportRow(
            sla_name="Availability",
            metric_type="availability",
            target_value=Decimal("99.9"),
            unit="%",
            measured_value=Decimal("99.5"),
            is_met=False,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            measured_at=datetime(2026, 2, 1, tzinfo=UTC),
        )
        assert row.sla_name == "Availability"
        assert row.is_met is False


# ---------------------------------------------------------------------------
# SessionCreate
# ---------------------------------------------------------------------------


class TestSessionCreate:
    def test_device_id_defaults_to_none(self) -> None:
        s = SessionCreate(user_name="alice", session_type=SessionType.local)
        assert s.device_id is None
        assert s.source_ip is None

    def test_user_name_required(self) -> None:
        with pytest.raises(ValidationError):
            SessionCreate(session_type=SessionType.rdp)

    def test_user_name_max_length(self) -> None:
        SessionCreate(user_name="a" * 255, session_type=SessionType.vpn)

    def test_user_name_over_max_raises(self) -> None:
        with pytest.raises(ValidationError):
            SessionCreate(user_name="a" * 256, session_type=SessionType.local)

    def test_all_session_types_accepted(self) -> None:
        for st in SessionType:
            s = SessionCreate(user_name="user", session_type=st)
            assert s.session_type == st


# ---------------------------------------------------------------------------
# SessionEnd
# ---------------------------------------------------------------------------


class TestSessionEnd:
    def test_ended_at_defaults_to_none(self) -> None:
        s = SessionEnd()
        assert s.ended_at is None

    def test_ended_at_can_be_set(self) -> None:
        now = datetime.now(tz=UTC)
        s = SessionEnd(ended_at=now)
        assert s.ended_at == now


# ---------------------------------------------------------------------------
# ActivityCreate
# ---------------------------------------------------------------------------


class TestActivityCreate:
    def test_all_activity_types_accepted(self) -> None:
        for at in ActivityType:
            a = ActivityCreate(user_name="bob", activity_type=at)
            assert a.activity_type == at

    def test_detail_defaults_to_none(self) -> None:
        a = ActivityCreate(user_name="bob", activity_type=ActivityType.app_launch)
        assert a.detail is None

    def test_detail_with_dict(self) -> None:
        a = ActivityCreate(
            user_name="bob",
            activity_type=ActivityType.file_access,
            detail={"path": "/docs/report.pdf"},
        )
        assert a.detail["path"] == "/docs/report.pdf"


# ---------------------------------------------------------------------------
# SessionAnalytics
# ---------------------------------------------------------------------------


class TestSessionAnalytics:
    def test_construction(self) -> None:
        a = SessionAnalytics(
            total_sessions=100,
            active_sessions=5,
            by_type={"local": 80, "rdp": 20},
            by_user=[],
            peak_hours=[],
        )
        assert a.total_sessions == 100
        assert a.by_type["local"] == 80


# ---------------------------------------------------------------------------
# UserBehaviorProfile
# ---------------------------------------------------------------------------


class TestUserBehaviorProfile:
    def test_construction(self) -> None:
        p = UserBehaviorProfile(
            user_name="alice",
            total_sessions=10,
            total_duration_minutes=300,
            avg_duration_minutes=30.0,
            session_types={"local": 10},
            activity_types={"app_launch": 25},
            recent_activities=[],
            active_sessions=1,
        )
        assert p.user_name == "alice"
        assert p.avg_duration_minutes == 30.0
        assert p.recent_activities == []
