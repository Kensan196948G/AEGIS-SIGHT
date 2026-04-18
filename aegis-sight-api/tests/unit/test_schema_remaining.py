"""Unit tests for batch, change_tracking, custom_view, export, ip_management, knowledge_base, log_event schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.ip_management import AssignmentStatus, AssignmentType
from app.models.knowledge_base import ArticleCategory, ArticleStatus
from app.models.log_event import FileAction, UsbAction
from app.schemas.batch import (
    BatchImportResponse,
    BatchJobListResponse,
    BatchJobResponse,
    BatchJobStatus,
    BatchJobType,
)
from app.schemas.change_tracking import (
    ChangeTypeSummary,
    ConfigSnapshotCreate,
    DiffEntry,
    SnapshotTypeSummary,
)
from app.schemas.custom_view import (
    CustomViewCreate,
    CustomViewUpdate,
    ShareToggleRequest,
)
from app.schemas.export import ExportDataType, ExportFormat, ExportParams
from app.schemas.ip_management import (
    IPAssignmentCreate,
    IPRangeCreate,
    IPRangeUtilization,
)
from app.schemas.knowledge_base import (
    HelpfulResponse,
    KBArticleCreate,
    KBArticleUpdate,
    KBCategoryCreate,
)
from app.schemas.log_event import LogSummaryResponse

# ---------------------------------------------------------------------------
# BatchJobStatus / BatchJobType enums
# ---------------------------------------------------------------------------


class TestBatchEnums:
    def test_job_status_values(self) -> None:
        assert BatchJobStatus.pending == "pending"
        assert BatchJobStatus.processing == "processing"
        assert BatchJobStatus.completed == "completed"
        assert BatchJobStatus.failed == "failed"

    def test_job_type_values(self) -> None:
        assert BatchJobType.import_devices == "import_devices"
        assert BatchJobType.export_licenses == "export_licenses"

    def test_four_job_statuses(self) -> None:
        assert len(BatchJobStatus) == 4

    def test_four_job_types(self) -> None:
        assert len(BatchJobType) == 4


# ---------------------------------------------------------------------------
# BatchImportResponse
# ---------------------------------------------------------------------------


class TestBatchImportResponse:
    def test_defaults(self) -> None:
        r = BatchImportResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.import_devices,
            status=BatchJobStatus.pending,
        )
        assert r.total_rows == 0
        assert r.success_count == 0
        assert r.error_count == 0
        assert r.errors == []
        assert r.message == ""

    def test_with_errors(self) -> None:
        r = BatchImportResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.import_licenses,
            status=BatchJobStatus.failed,
            total_rows=10,
            error_count=3,
            errors=[{"row": 1, "msg": "invalid"}, {"row": 5, "msg": "missing field"}],
        )
        assert r.error_count == 3
        assert len(r.errors) == 2


# ---------------------------------------------------------------------------
# BatchJobResponse / BatchJobListResponse
# ---------------------------------------------------------------------------


class TestBatchJobResponse:
    def test_construction(self) -> None:
        r = BatchJobResponse(
            job_id=uuid.uuid4(),
            job_type=BatchJobType.export_devices,
            status=BatchJobStatus.completed,
            total_rows=100,
            success_count=98,
            error_count=2,
            created_at=datetime.now(UTC),
        )
        assert r.status == BatchJobStatus.completed
        assert r.completed_at is None
        assert r.created_by is None

    def test_all_job_types(self) -> None:
        for jt in BatchJobType:
            r = BatchJobResponse(
                job_id=uuid.uuid4(),
                job_type=jt,
                status=BatchJobStatus.pending,
                total_rows=0,
                success_count=0,
                error_count=0,
                created_at=datetime.now(UTC),
            )
            assert r.job_type == jt


class TestBatchJobListResponse:
    def test_empty_list(self) -> None:
        r = BatchJobListResponse(jobs=[], total=0)
        assert r.jobs == []
        assert r.total == 0


# ---------------------------------------------------------------------------
# ConfigSnapshotCreate
# ---------------------------------------------------------------------------


class TestConfigSnapshotCreate:
    def test_valid_snapshot_types(self) -> None:
        for stype in ("hardware", "software", "security", "network"):
            s = ConfigSnapshotCreate(
                device_id=uuid.uuid4(),
                snapshot_type=stype,
                data={"key": "value"},
            )
            assert s.snapshot_type == stype

    def test_invalid_snapshot_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            ConfigSnapshotCreate(
                device_id=uuid.uuid4(),
                snapshot_type="unknown",
                data={},
            )

    def test_data_required(self) -> None:
        with pytest.raises(ValidationError):
            ConfigSnapshotCreate(device_id=uuid.uuid4(), snapshot_type="hardware")  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# ChangeTypeSummary / SnapshotTypeSummary / DiffEntry
# ---------------------------------------------------------------------------


class TestChangeTypeSummary:
    def test_defaults_zero(self) -> None:
        s = ChangeTypeSummary()
        assert s.added == 0
        assert s.modified == 0
        assert s.removed == 0

    def test_with_values(self) -> None:
        s = ChangeTypeSummary(added=5, modified=10, removed=2)
        assert s.added == 5


class TestSnapshotTypeSummary:
    def test_defaults_zero(self) -> None:
        s = SnapshotTypeSummary()
        assert s.hardware == 0
        assert s.software == 0
        assert s.security == 0
        assert s.network == 0


class TestDiffEntry:
    def test_optional_values(self) -> None:
        d = DiffEntry(field_path="os_version", change_type="modified")
        assert d.old_value is None
        assert d.new_value is None

    def test_with_values(self) -> None:
        d = DiffEntry(
            field_path="hostname",
            change_type="modified",
            old_value="pc-old",
            new_value="pc-new",
        )
        assert d.new_value == "pc-new"


# ---------------------------------------------------------------------------
# CustomViewCreate
# ---------------------------------------------------------------------------


class TestCustomViewCreate:
    def test_defaults(self) -> None:
        v = CustomViewCreate(name="My View", entity_type="devices")
        assert v.is_default is False
        assert v.is_shared is False
        assert v.sort_order == "asc"
        assert v.columns is None

    def test_invalid_entity_type_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="V", entity_type="unknown_type")

    def test_valid_entity_types(self) -> None:
        for et in ("devices", "licenses", "procurements"):
            v = CustomViewCreate(name="V", entity_type=et)
            assert v.entity_type == et

    def test_name_min_length_1(self) -> None:
        v = CustomViewCreate(name="X", entity_type="devices")
        assert v.name == "X"

    def test_name_empty_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="", entity_type="devices")

    def test_name_max_200(self) -> None:
        CustomViewCreate(name="X" * 200, entity_type="licenses")

    def test_name_over_200_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="X" * 201, entity_type="devices")

    def test_invalid_sort_order_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewCreate(name="V", entity_type="devices", sort_order="invalid")

    def test_valid_sort_orders(self) -> None:
        for order in ("asc", "desc"):
            v = CustomViewCreate(name="V", entity_type="devices", sort_order=order)
            assert v.sort_order == order


# ---------------------------------------------------------------------------
# CustomViewUpdate
# ---------------------------------------------------------------------------


class TestCustomViewUpdate:
    def test_all_optional(self) -> None:
        u = CustomViewUpdate()
        assert u.name is None
        assert u.entity_type is None

    def test_invalid_sort_order_raises(self) -> None:
        with pytest.raises(ValidationError):
            CustomViewUpdate(sort_order="bad")


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
# ExportParams
# ---------------------------------------------------------------------------


class TestExportParams:
    def test_defaults(self) -> None:
        p = ExportParams()
        assert p.format == ExportFormat.csv
        assert p.date_from is None
        assert p.date_to is None

    def test_all_formats(self) -> None:
        for fmt in ExportFormat:
            p = ExportParams(format=fmt)
            assert p.format == fmt

    def test_all_data_types(self) -> None:
        for dt in ExportDataType:
            assert dt.value in ("devices", "licenses", "alerts", "audit-logs")

    def test_with_date_range(self) -> None:
        now = datetime.now(UTC)
        p = ExportParams(date_from=now, date_to=now)
        assert p.date_from == now


# ---------------------------------------------------------------------------
# IPRangeCreate
# ---------------------------------------------------------------------------


class TestIPRangeCreate:
    def test_basic_construction(self) -> None:
        r = IPRangeCreate(
            network_address="192.168.1.0/24",
            name="Office LAN",
        )
        assert r.dhcp_enabled is False
        assert r.vlan_id is None
        assert r.gateway is None

    def test_with_optional_fields(self) -> None:
        r = IPRangeCreate(
            network_address="10.0.0.0/8",
            name="Corporate",
            vlan_id=100,
            gateway="10.0.0.1",
            dhcp_enabled=True,
        )
        assert r.vlan_id == 100
        assert r.dhcp_enabled is True

    def test_name_max_255(self) -> None:
        IPRangeCreate(network_address="10.0.0.0/24", name="X" * 255)

    def test_name_over_255_raises(self) -> None:
        with pytest.raises(ValidationError):
            IPRangeCreate(network_address="10.0.0.0/24", name="X" * 256)


# ---------------------------------------------------------------------------
# IPAssignmentCreate
# ---------------------------------------------------------------------------


class TestIPAssignmentCreate:
    def test_defaults(self) -> None:
        a = IPAssignmentCreate(
            ip_address="192.168.1.10",
            range_id=uuid.uuid4(),
        )
        assert a.assignment_type == AssignmentType.static
        assert a.status == AssignmentStatus.active
        assert a.mac_address is None

    def test_all_assignment_types(self) -> None:
        for at in AssignmentType:
            a = IPAssignmentCreate(
                ip_address="10.0.0.1",
                range_id=uuid.uuid4(),
                assignment_type=at,
            )
            assert a.assignment_type == at

    def test_all_statuses(self) -> None:
        for st in AssignmentStatus:
            a = IPAssignmentCreate(
                ip_address="10.0.0.2",
                range_id=uuid.uuid4(),
                status=st,
            )
            assert a.status == st


# ---------------------------------------------------------------------------
# IPRangeUtilization
# ---------------------------------------------------------------------------


class TestIPRangeUtilization:
    def test_construction(self) -> None:
        u = IPRangeUtilization(
            range_id=uuid.uuid4(),
            network_address="192.168.0.0/24",
            name="LAN",
            total_hosts=254,
            assigned_count=100,
            active_count=80,
            reserved_count=10,
            utilization_percent=39.4,
        )
        assert u.utilization_percent == 39.4


# ---------------------------------------------------------------------------
# KBArticleCreate
# ---------------------------------------------------------------------------


class TestKBArticleCreate:
    def test_default_status_draft(self) -> None:
        a = KBArticleCreate(
            title="How to reset password",
            content="Step 1: ...",
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
                title="T", content="C",
                category=ArticleCategory.faq,
                status=st,
            )
            assert a.status == st

    def test_with_tags(self) -> None:
        a = KBArticleCreate(
            title="T",
            content="C",
            category=ArticleCategory.troubleshooting,
            tags=["windows", "security"],
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

    def test_partial_update(self) -> None:
        u = KBArticleUpdate(status=ArticleStatus.published)
        assert u.status == ArticleStatus.published


# ---------------------------------------------------------------------------
# KBCategoryCreate
# ---------------------------------------------------------------------------


class TestKBCategoryCreate:
    def test_defaults(self) -> None:
        c = KBCategoryCreate(name="How-To Guides", description="Step by step guides")
        assert c.icon is None
        assert c.sort_order == 0
        assert c.parent_id is None

    def test_with_parent(self) -> None:
        pid = uuid.uuid4()
        c = KBCategoryCreate(
            name="Sub",
            description="Sub-category",
            parent_id=pid,
            sort_order=5,
        )
        assert c.parent_id == pid
        assert c.sort_order == 5


# ---------------------------------------------------------------------------
# HelpfulResponse
# ---------------------------------------------------------------------------


class TestHelpfulResponse:
    def test_construction(self) -> None:
        r = HelpfulResponse(helpful_count=42)
        assert r.helpful_count == 42


# ---------------------------------------------------------------------------
# LogSummaryResponse
# ---------------------------------------------------------------------------


class TestLogSummaryResponse:
    def test_construction(self) -> None:
        s = LogSummaryResponse(
            total_logon_events=500,
            total_usb_events=50,
            total_file_events=1200,
            unique_users=30,
            unique_devices=20,
        )
        assert s.total_logon_events == 500
        assert s.unique_devices == 20


# ---------------------------------------------------------------------------
# UsbEventResponse (log_event enum coverage)
# ---------------------------------------------------------------------------


class TestUsbAction:
    def test_connected(self) -> None:
        assert UsbAction.connected == "connected"

    def test_disconnected(self) -> None:
        assert UsbAction.disconnected == "disconnected"

    def test_two_values(self) -> None:
        assert len(UsbAction) == 2


class TestFileAction:
    def test_all_file_actions(self) -> None:
        for action in FileAction:
            assert action.value in ("create", "modify", "delete", "read")

    def test_four_values(self) -> None:
        assert len(FileAction) == 4
