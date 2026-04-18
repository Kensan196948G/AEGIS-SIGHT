"""Unit tests for custom_view and log_event Pydantic schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.log_event import FileAction, UsbAction
from app.schemas.custom_view import (
    CustomViewCreate,
    CustomViewUpdate,
    ShareToggleRequest,
)
from app.schemas.log_event import LogSummaryResponse

# ---------------------------------------------------------------------------
# CustomViewCreate
# ---------------------------------------------------------------------------


class TestCustomViewCreate:
    def test_defaults(self) -> None:
        v = CustomViewCreate(name="My View", entity_type="devices")
        assert v.sort_order == "asc"
        assert v.is_default is False
        assert v.is_shared is False
        assert v.columns is None
        assert v.filters is None

    def test_valid_entity_types(self) -> None:
        for et in ("devices", "licenses", "procurements"):
            v = CustomViewCreate(name="V", entity_type=et)
            assert v.entity_type == et

    def test_invalid_entity_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="V", entity_type="alerts")

    def test_name_min_length_1(self) -> None:
        CustomViewCreate(name="x", entity_type="devices")

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="", entity_type="devices")

    def test_name_max_200(self) -> None:
        CustomViewCreate(name="x" * 200, entity_type="devices")

    def test_name_over_200_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="x" * 201, entity_type="devices")

    def test_sort_order_desc(self) -> None:
        v = CustomViewCreate(name="V", entity_type="licenses", sort_order="desc")
        assert v.sort_order == "desc"

    def test_invalid_sort_order_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="V", entity_type="devices", sort_order="random")

    def test_with_columns_and_filters(self) -> None:
        v = CustomViewCreate(
            name="Filtered",
            entity_type="procurements",
            columns={"cols": ["name", "status"]},
            filters={"status": "pending"},
        )
        assert v.filters["status"] == "pending"


# ---------------------------------------------------------------------------
# CustomViewUpdate
# ---------------------------------------------------------------------------


class TestCustomViewUpdate:
    def test_all_optional(self) -> None:
        u = CustomViewUpdate()
        assert u.name is None
        assert u.entity_type is None
        assert u.sort_order is None

    def test_invalid_entity_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewUpdate(entity_type="unknown")

    def test_invalid_sort_order_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewUpdate(sort_order="ASC")

    def test_partial_update(self) -> None:
        u = CustomViewUpdate(name="Updated", is_default=True)
        assert u.name == "Updated"
        assert u.is_default is True


# ---------------------------------------------------------------------------
# ShareToggleRequest
# ---------------------------------------------------------------------------


class TestShareToggleRequest:
    def test_share(self) -> None:
        r = ShareToggleRequest(is_shared=True)
        assert r.is_shared is True

    def test_unshare(self) -> None:
        r = ShareToggleRequest(is_shared=False)
        assert r.is_shared is False


# ---------------------------------------------------------------------------
# FileAction / UsbAction enum values
# ---------------------------------------------------------------------------


class TestFileAction:
    def test_create_value(self) -> None:
        assert FileAction.create == "create"

    def test_all_actions(self) -> None:
        assert len(FileAction) == 4

    def test_delete_value(self) -> None:
        assert FileAction.delete == "delete"


class TestUsbAction:
    def test_connected_value(self) -> None:
        assert UsbAction.connected == "connected"

    def test_two_actions(self) -> None:
        assert len(UsbAction) == 2


# ---------------------------------------------------------------------------
# LogSummaryResponse
# ---------------------------------------------------------------------------


class TestLogSummaryResponse:
    def test_construction(self) -> None:
        r = LogSummaryResponse(
            total_logon_events=100,
            total_usb_events=20,
            total_file_events=500,
            unique_users=30,
            unique_devices=50,
        )
        assert r.total_logon_events == 100
        assert r.unique_users == 30

    def test_zeros(self) -> None:
        r = LogSummaryResponse(
            total_logon_events=0,
            total_usb_events=0,
            total_file_events=0,
            unique_users=0,
            unique_devices=0,
        )
        assert r.total_file_events == 0
