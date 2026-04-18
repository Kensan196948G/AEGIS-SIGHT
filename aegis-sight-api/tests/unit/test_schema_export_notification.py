"""Unit tests for export and notification_channel Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.notification_channel import ChannelType, NotificationEventType
from app.schemas.export import (
    ExportDataType,
    ExportFormat,
    ExportHistoryItem,
    ExportParams,
)
from app.schemas.notification_channel import (
    NotificationChannelCreate,
    NotificationChannelTestResult,
    NotificationChannelUpdate,
    NotificationRuleCreate,
    NotificationRuleUpdate,
)


# ---------------------------------------------------------------------------
# ExportFormat / ExportDataType
# ---------------------------------------------------------------------------


class TestExportFormat:
    def test_csv_value(self) -> None:
        assert ExportFormat.csv == "csv"

    def test_json_value(self) -> None:
        assert ExportFormat.json == "json"

    def test_two_formats(self) -> None:
        assert len(ExportFormat) == 2


class TestExportDataType:
    def test_devices_value(self) -> None:
        assert ExportDataType.devices == "devices"

    def test_audit_logs_value(self) -> None:
        assert ExportDataType.audit_logs == "audit-logs"

    def test_four_types(self) -> None:
        assert len(ExportDataType) == 4


# ---------------------------------------------------------------------------
# ExportParams
# ---------------------------------------------------------------------------


class TestExportParams:
    def test_defaults(self) -> None:
        p = ExportParams()
        assert p.format == ExportFormat.csv
        assert p.date_from is None
        assert p.date_to is None

    def test_json_format(self) -> None:
        p = ExportParams(format=ExportFormat.json)
        assert p.format == ExportFormat.json

    def test_with_date_range(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=timezone.utc)
        p = ExportParams(date_from=now, date_to=datetime(2026, 12, 31, tzinfo=timezone.utc))
        assert p.date_from == now


# ---------------------------------------------------------------------------
# ExportHistoryItem
# ---------------------------------------------------------------------------


class TestExportHistoryItem:
    def test_exported_by_defaults_none(self) -> None:
        item = ExportHistoryItem(
            id="export-1",
            data_type=ExportDataType.devices,
            format=ExportFormat.csv,
            row_count=100,
            exported_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        assert item.exported_by is None

    def test_with_exported_by(self) -> None:
        item = ExportHistoryItem(
            id="export-2",
            data_type=ExportDataType.licenses,
            format=ExportFormat.json,
            row_count=50,
            exported_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
            exported_by="admin@example.com",
        )
        assert item.exported_by == "admin@example.com"

    def test_all_data_types(self) -> None:
        now = datetime(2026, 1, 1, tzinfo=timezone.utc)
        for dt in ExportDataType:
            item = ExportHistoryItem(
                id="e", data_type=dt, format=ExportFormat.csv, row_count=0, exported_at=now
            )
            assert item.data_type == dt


# ---------------------------------------------------------------------------
# NotificationChannelCreate
# ---------------------------------------------------------------------------


class TestNotificationChannelCreate:
    def test_defaults(self) -> None:
        c = NotificationChannelCreate(name="Email Channel", channel_type=ChannelType.email)
        assert c.is_enabled is True
        assert c.config == {}

    def test_all_channel_types(self) -> None:
        for ct in ChannelType:
            c = NotificationChannelCreate(name="Chan", channel_type=ct)
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
            name="Disabled", channel_type=ChannelType.teams, is_enabled=False
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


# ---------------------------------------------------------------------------
# NotificationChannelTestResult
# ---------------------------------------------------------------------------


class TestNotificationChannelTestResult:
    def test_success(self) -> None:
        r = NotificationChannelTestResult(success=True, message="OK")
        assert r.success is True
        assert r.message == "OK"

    def test_failure(self) -> None:
        r = NotificationChannelTestResult(success=False, message="Connection refused")
        assert r.success is False


# ---------------------------------------------------------------------------
# NotificationRuleCreate
# ---------------------------------------------------------------------------


class TestNotificationRuleCreate:
    def test_defaults(self) -> None:
        r = NotificationRuleCreate(
            name="Critical Alert Rule",
            event_type=NotificationEventType.alert_critical,
            channel_id=uuid.uuid4(),
        )
        assert r.is_enabled is True
        assert r.conditions is None

    def test_all_event_types(self) -> None:
        uid = uuid.uuid4()
        for et in NotificationEventType:
            r = NotificationRuleCreate(name="R", event_type=et, channel_id=uid)
            assert r.event_type == et

    def test_with_conditions(self) -> None:
        r = NotificationRuleCreate(
            name="Filtered",
            event_type=NotificationEventType.license_violation,
            channel_id=uuid.uuid4(),
            conditions={"severity": "critical"},
        )
        assert r.conditions["severity"] == "critical"

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            NotificationRuleCreate(name="R")


# ---------------------------------------------------------------------------
# NotificationRuleUpdate
# ---------------------------------------------------------------------------


class TestNotificationRuleUpdate:
    def test_all_optional(self) -> None:
        u = NotificationRuleUpdate()
        assert u.name is None
        assert u.event_type is None
        assert u.is_enabled is None

    def test_partial_update(self) -> None:
        u = NotificationRuleUpdate(name="Updated Rule", is_enabled=False)
        assert u.name == "Updated Rule"
