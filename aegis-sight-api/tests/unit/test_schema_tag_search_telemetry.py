"""Unit tests for tag, search, system_config, and telemetry Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.models.tag import TagCategory
from app.schemas.search import SearchResponse, SearchResultGroup, SearchResultItem
from app.schemas.system_config import (
    SystemConfigListResponse,
    SystemConfigResponse,
    SystemConfigUpdate,
)
from app.schemas.tag import (
    TagAssignRequest,
    TagAssignResponse,
    TagCreate,
    TagEntityItem,
    TagResponse,
)
from app.schemas.telemetry import (
    DeviceInfo,
    HardwareInfo,
    SecurityInfo,
    SoftwareItem,
    TelemetryPayload,
    TelemetryResponse,
)


# ---------------------------------------------------------------------------
# TagCreate
# ---------------------------------------------------------------------------


class TestTagCreate:
    def test_defaults(self) -> None:
        t = TagCreate(name="infra")
        assert t.color == "#6366f1"
        assert t.category == TagCategory.general

    def test_custom_color(self) -> None:
        t = TagCreate(name="prod", color="#ff0000")
        assert t.color == "#ff0000"

    def test_invalid_color_raises(self) -> None:
        with pytest.raises(ValidationError):
            TagCreate(name="x", color="red")

    def test_invalid_color_short_raises(self) -> None:
        with pytest.raises(ValidationError):
            TagCreate(name="x", color="#fff")

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValidationError):
            TagCreate(name="")

    def test_name_max_100(self) -> None:
        TagCreate(name="a" * 100)  # must not raise

    def test_name_over_100_raises(self) -> None:
        with pytest.raises(ValidationError):
            TagCreate(name="a" * 101)

    def test_category_device(self) -> None:
        t = TagCreate(name="hw", category=TagCategory.device)
        assert t.category == TagCategory.device


# ---------------------------------------------------------------------------
# TagAssignRequest
# ---------------------------------------------------------------------------


class TestTagAssignRequest:
    def test_valid_entity_types(self) -> None:
        uid = uuid.uuid4()
        for et in ["device", "license", "procurement"]:
            req = TagAssignRequest(tag_id=uid, entity_type=et, entity_id=uid)
            assert req.entity_type == et

    def test_invalid_entity_type_raises(self) -> None:
        uid = uuid.uuid4()
        with pytest.raises(ValidationError):
            TagAssignRequest(tag_id=uid, entity_type="user", entity_id=uid)


# ---------------------------------------------------------------------------
# SearchResultItem
# ---------------------------------------------------------------------------


class TestSearchResultItem:
    def test_subtitle_defaults_to_none(self) -> None:
        item = SearchResultItem(
            id=uuid.uuid4(),
            type="device",
            title="PC-001",
            matched_field="hostname",
            matched_value="PC-001",
        )
        assert item.subtitle is None
        assert item.created_at is None

    def test_from_attributes_enabled(self) -> None:
        assert SearchResultItem.model_config.get("from_attributes") is True


# ---------------------------------------------------------------------------
# SearchResultGroup
# ---------------------------------------------------------------------------


class TestSearchResultGroup:
    def test_construction(self) -> None:
        item = SearchResultItem(
            id=uuid.uuid4(),
            type="device",
            title="PC-001",
            matched_field="hostname",
            matched_value="PC-001",
        )
        g = SearchResultGroup(type="device", count=1, items=[item])
        assert g.count == 1
        assert len(g.items) == 1

    def test_empty_items(self) -> None:
        g = SearchResultGroup(type="license", count=0, items=[])
        assert g.items == []


# ---------------------------------------------------------------------------
# SearchResponse
# ---------------------------------------------------------------------------


class TestSearchResponse:
    def test_construction(self) -> None:
        r = SearchResponse(query="PC", total=2, groups=[], offset=0, limit=20, has_more=False)
        assert r.query == "PC"
        assert r.has_more is False

    def test_has_more_true(self) -> None:
        r = SearchResponse(query="x", total=100, groups=[], offset=0, limit=10, has_more=True)
        assert r.has_more is True


# ---------------------------------------------------------------------------
# SystemConfigUpdate
# ---------------------------------------------------------------------------


class TestSystemConfigUpdate:
    def test_any_value_accepted(self) -> None:
        for v in [42, "text", {"nested": True}, [1, 2, 3], None]:
            u = SystemConfigUpdate(value=v)
            assert u.value == v


# ---------------------------------------------------------------------------
# SystemConfigListResponse
# ---------------------------------------------------------------------------


class TestSystemConfigListResponse:
    def test_empty_list(self) -> None:
        r = SystemConfigListResponse(items=[], total=0)
        assert r.items == []
        assert r.total == 0


# ---------------------------------------------------------------------------
# DeviceInfo
# ---------------------------------------------------------------------------


class TestDeviceInfo:
    def test_hostname_required(self) -> None:
        with pytest.raises(ValidationError):
            DeviceInfo()

    def test_optional_fields_default_none(self) -> None:
        d = DeviceInfo(hostname="PC-001")
        assert d.os_version is None
        assert d.ip_address is None
        assert d.mac_address is None
        assert d.domain is None

    def test_valid_mac_address(self) -> None:
        d = DeviceInfo(hostname="PC-001", mac_address="AA:BB:CC:DD:EE:FF")
        assert d.mac_address == "AA:BB:CC:DD:EE:FF"

    def test_hyphen_mac_address(self) -> None:
        d = DeviceInfo(hostname="PC-001", mac_address="AA-BB-CC-DD-EE-FF")
        assert d.mac_address == "AA-BB-CC-DD-EE-FF"

    def test_invalid_mac_raises(self) -> None:
        with pytest.raises(ValidationError):
            DeviceInfo(hostname="PC-001", mac_address="not-a-mac")

    def test_empty_hostname_raises(self) -> None:
        with pytest.raises(ValidationError):
            DeviceInfo(hostname="")


# ---------------------------------------------------------------------------
# HardwareInfo
# ---------------------------------------------------------------------------


class TestHardwareInfo:
    def test_all_optional(self) -> None:
        h = HardwareInfo()
        assert h.cpu_model is None
        assert h.memory_gb is None

    def test_negative_memory_raises(self) -> None:
        with pytest.raises(ValidationError):
            HardwareInfo(memory_gb=-1.0)

    def test_zero_disk_allowed(self) -> None:
        h = HardwareInfo(disk_total_gb=0, disk_free_gb=0)
        assert h.disk_total_gb == 0


# ---------------------------------------------------------------------------
# SecurityInfo
# ---------------------------------------------------------------------------


class TestSecurityInfo:
    def test_defaults(self) -> None:
        s = SecurityInfo()
        assert s.defender_on is False
        assert s.bitlocker_on is False
        assert s.pending_patches == 0

    def test_negative_patches_raises(self) -> None:
        with pytest.raises(ValidationError):
            SecurityInfo(pending_patches=-1)

    def test_enabled_flags(self) -> None:
        s = SecurityInfo(defender_on=True, bitlocker_on=True)
        assert s.defender_on is True


# ---------------------------------------------------------------------------
# SoftwareItem
# ---------------------------------------------------------------------------


class TestSoftwareItem:
    def test_name_required(self) -> None:
        with pytest.raises(ValidationError):
            SoftwareItem()

    def test_optional_fields(self) -> None:
        s = SoftwareItem(name="Office")
        assert s.version is None
        assert s.publisher is None

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValidationError):
            SoftwareItem(name="")


# ---------------------------------------------------------------------------
# TelemetryPayload
# ---------------------------------------------------------------------------


class TestTelemetryPayload:
    def test_minimal_payload(self) -> None:
        p = TelemetryPayload(
            device_info=DeviceInfo(hostname="PC-001"),
            collected_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        assert p.hardware is None
        assert p.security is None
        assert p.software_inventory == []

    def test_full_payload(self) -> None:
        p = TelemetryPayload(
            device_info=DeviceInfo(hostname="PC-002", ip_address="192.168.1.1"),
            hardware=HardwareInfo(memory_gb=16.0),
            security=SecurityInfo(defender_on=True),
            software_inventory=[SoftwareItem(name="Office")],
            collected_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        assert p.hardware.memory_gb == 16.0
        assert len(p.software_inventory) == 1


# ---------------------------------------------------------------------------
# TelemetryResponse
# ---------------------------------------------------------------------------


class TestTelemetryResponse:
    def test_defaults(self) -> None:
        r = TelemetryResponse(device_id="uuid-1", hostname="PC-001")
        assert r.status == "accepted"
        assert r.snapshots_saved == 0

    def test_custom_status(self) -> None:
        r = TelemetryResponse(device_id="uid", hostname="PC", status="updated", snapshots_saved=5)
        assert r.snapshots_saved == 5
