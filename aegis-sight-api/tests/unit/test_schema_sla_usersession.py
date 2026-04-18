"""Unit tests for sla and user_session Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
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
        d = SLADefinitionCreate(
            name="Availability SLA",
            metric_type=SLAMetricType.availability,
            target_value=Decimal("99.9"),
            unit="%",
            measurement_period=MeasurementPeriod.monthly,
            warning_threshold=Decimal("99.5"),
        )
        assert d.is_active is True
        assert d.description is None

    def test_all_metric_types(self) -> None:
        for mt in SLAMetricType:
            d = SLADefinitionCreate(
                name="SLA",
                metric_type=mt,
                target_value=Decimal("100"),
                unit="unit",
                measurement_period=MeasurementPeriod.daily,
                warning_threshold=Decimal("90"),
            )
            assert d.metric_type == mt

    def test_all_measurement_periods(self) -> None:
        for period in MeasurementPeriod:
            d = SLADefinitionCreate(
                name="SLA",
                metric_type=SLAMetricType.response_time,
                target_value=Decimal("60"),
                unit="min",
                measurement_period=period,
                warning_threshold=Decimal("50"),
            )
            assert d.measurement_period == period

    def test_inactive_sla(self) -> None:
        d = SLADefinitionCreate(
            name="Deprecated SLA",
            metric_type=SLAMetricType.patch_compliance,
            target_value=Decimal("95"),
            unit="%",
            measurement_period=MeasurementPeriod.weekly,
            warning_threshold=Decimal("90"),
            is_active=False,
        )
        assert d.is_active is False

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            SLADefinitionCreate(name="SLA")  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# SLADefinitionUpdate
# ---------------------------------------------------------------------------


class TestSLADefinitionUpdate:
    def test_all_optional(self) -> None:
        u = SLADefinitionUpdate()
        assert u.name is None
        assert u.metric_type is None
        assert u.target_value is None
        assert u.is_active is None

    def test_partial_update(self) -> None:
        u = SLADefinitionUpdate(is_active=False, warning_threshold=Decimal("85"))
        assert u.is_active is False
        assert u.warning_threshold == Decimal("85")


# ---------------------------------------------------------------------------
# SLAMeasurementCreate
# ---------------------------------------------------------------------------


class TestSLAMeasurementCreate:
    def test_construction(self) -> None:
        m = SLAMeasurementCreate(
            sla_id=uuid.uuid4(),
            measured_value=Decimal("99.8"),
            target_value=Decimal("99.9"),
            is_met=False,
            period_start=date(2026, 3, 1),
            period_end=date(2026, 3, 31),
        )
        assert m.is_met is False
        assert m.detail is None

    def test_met_with_detail(self) -> None:
        m = SLAMeasurementCreate(
            sla_id=uuid.uuid4(),
            measured_value=Decimal("100"),
            target_value=Decimal("99.9"),
            is_met=True,
            period_start=date(2026, 4, 1),
            period_end=date(2026, 4, 30),
            detail={"incidents": 0},
        )
        assert m.is_met is True
        assert m.detail["incidents"] == 0


# ---------------------------------------------------------------------------
# SLADashboardItem
# ---------------------------------------------------------------------------


class TestSLADashboardItem:
    def test_optional_fields(self) -> None:
        item = SLADashboardItem(
            sla_id=uuid.uuid4(),
            name="Availability",
            metric_type=SLAMetricType.availability,
            target_value=Decimal("99.9"),
            current_value=None,
            achievement_rate=None,
            is_met=None,
            measurement_period=MeasurementPeriod.monthly,
            total_measurements=10,
            met_count=9,
            violation_count=1,
        )
        assert item.current_value is None
        assert item.achievement_rate is None
        assert item.is_met is None

    def test_with_current_values(self) -> None:
        item = SLADashboardItem(
            sla_id=uuid.uuid4(),
            name="Response Time",
            metric_type=SLAMetricType.response_time,
            target_value=Decimal("60"),
            current_value=Decimal("45"),
            achievement_rate=95.0,
            is_met=True,
            measurement_period=MeasurementPeriod.weekly,
            total_measurements=4,
            met_count=4,
            violation_count=0,
        )
        assert item.achievement_rate == 95.0
        assert item.is_met is True


# ---------------------------------------------------------------------------
# SLADashboard
# ---------------------------------------------------------------------------


class TestSLADashboard:
    def test_construction(self) -> None:
        d = SLADashboard(
            overall_achievement_rate=92.5,
            total_definitions=5,
            active_definitions=4,
            total_violations=2,
            items=[],
        )
        assert d.overall_achievement_rate == 92.5
        assert d.items == []

    def test_overall_rate_optional(self) -> None:
        d = SLADashboard(
            overall_achievement_rate=None,
            total_definitions=0,
            active_definitions=0,
            total_violations=0,
            items=[],
        )
        assert d.overall_achievement_rate is None


# ---------------------------------------------------------------------------
# SLAReportRow
# ---------------------------------------------------------------------------


class TestSLAReportRow:
    def test_construction(self) -> None:
        r = SLAReportRow(
            sla_name="Availability",
            metric_type="availability",
            target_value=Decimal("99.9"),
            unit="%",
            measured_value=Decimal("99.95"),
            is_met=True,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            measured_at=datetime.now(timezone.utc),
        )
        assert r.is_met is True
        assert r.unit == "%"


# ---------------------------------------------------------------------------
# SessionCreate
# ---------------------------------------------------------------------------


class TestSessionCreate:
    def test_basic_construction(self) -> None:
        s = SessionCreate(user_name="alice", session_type=SessionType.rdp)
        assert s.device_id is None
        assert s.source_ip is None
        assert s.source_hostname is None

    def test_all_session_types(self) -> None:
        for st in SessionType:
            s = SessionCreate(user_name="u", session_type=st)
            assert s.session_type == st

    def test_with_source_info(self) -> None:
        s = SessionCreate(
            user_name="bob",
            session_type=SessionType.vpn,
            source_ip="203.0.113.1",
            source_hostname="laptop-bob",
            device_id=uuid.uuid4(),
        )
        assert s.source_ip == "203.0.113.1"
        assert s.source_hostname == "laptop-bob"

    def test_user_name_max_255(self) -> None:
        SessionCreate(user_name="x" * 255, session_type=SessionType.local)

    def test_user_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            SessionCreate(user_name="x" * 256, session_type=SessionType.local)


# ---------------------------------------------------------------------------
# SessionEnd
# ---------------------------------------------------------------------------


class TestSessionEnd:
    def test_all_optional(self) -> None:
        s = SessionEnd()
        assert s.ended_at is None

    def test_with_end_time(self) -> None:
        ts = datetime.now(timezone.utc)
        s = SessionEnd(ended_at=ts)
        assert s.ended_at == ts


# ---------------------------------------------------------------------------
# ActivityCreate
# ---------------------------------------------------------------------------


class TestActivityCreate:
    def test_all_activity_types(self) -> None:
        for at in ActivityType:
            a = ActivityCreate(user_name="alice", activity_type=at)
            assert a.activity_type == at

    def test_defaults(self) -> None:
        a = ActivityCreate(user_name="bob", activity_type=ActivityType.app_launch)
        assert a.device_id is None
        assert a.detail is None

    def test_with_detail(self) -> None:
        a = ActivityCreate(
            user_name="carol",
            activity_type=ActivityType.file_access,
            detail={"path": "/home/carol/doc.pdf", "action": "read"},
        )
        assert a.detail["action"] == "read"


# ---------------------------------------------------------------------------
# SessionAnalytics
# ---------------------------------------------------------------------------


class TestSessionAnalytics:
    def test_construction(self) -> None:
        a = SessionAnalytics(
            total_sessions=200,
            active_sessions=15,
            by_type={"rdp": 100, "vpn": 80, "local": 20},
            by_user=[{"user": "alice", "count": 50}],
            peak_hours=[{"hour": 9, "count": 30}],
        )
        assert a.total_sessions == 200
        assert a.by_type["rdp"] == 100


# ---------------------------------------------------------------------------
# UserBehaviorProfile
# ---------------------------------------------------------------------------


class TestUserBehaviorProfile:
    def test_construction(self) -> None:
        p = UserBehaviorProfile(
            user_name="alice",
            total_sessions=50,
            total_duration_minutes=3000,
            avg_duration_minutes=60.0,
            session_types={"rdp": 30, "local": 20},
            activity_types={"app_launch": 200, "file_access": 100},
            recent_activities=[],
            active_sessions=2,
        )
        assert p.user_name == "alice"
        assert p.avg_duration_minutes == 60.0
        assert p.recent_activities == []
