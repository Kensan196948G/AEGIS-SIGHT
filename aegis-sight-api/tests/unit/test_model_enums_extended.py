"""Unit tests for security domain model Enum classes (extended) — no DB required."""

import enum

from app.models.alert import AlertCategory, AlertSeverity
from app.models.asset_lifecycle import DisposalMethod, DisposalStatus, LifecycleEventType
from app.models.change_tracking import ChangeType, SnapshotType
from app.models.device import DeviceStatus
from app.models.dlp import DLPAction, DLPActionTaken, DLPRuleType, DLPSeverity
from app.models.ip_management import AssignmentStatus, AssignmentType


# ---------------------------------------------------------------------------
# AlertSeverity
# ---------------------------------------------------------------------------


class TestAlertSeverity:
    def test_is_str_enum(self) -> None:
        assert issubclass(AlertSeverity, str)

    def test_critical_value(self) -> None:
        assert AlertSeverity.critical == "critical"

    def test_warning_value(self) -> None:
        assert AlertSeverity.warning == "warning"

    def test_info_value(self) -> None:
        assert AlertSeverity.info == "info"

    def test_member_count(self) -> None:
        assert len(AlertSeverity) == 3

    def test_all_values_are_strings(self) -> None:
        for member in AlertSeverity:
            assert isinstance(member.value, str)


# ---------------------------------------------------------------------------
# AlertCategory
# ---------------------------------------------------------------------------


class TestAlertCategory:
    def test_is_str_enum(self) -> None:
        assert issubclass(AlertCategory, str)

    def test_security_value(self) -> None:
        assert AlertCategory.security == "security"

    def test_license_value(self) -> None:
        assert AlertCategory.license == "license"

    def test_hardware_value(self) -> None:
        assert AlertCategory.hardware == "hardware"

    def test_network_value(self) -> None:
        assert AlertCategory.network == "network"

    def test_member_count(self) -> None:
        assert len(AlertCategory) == 4


# ---------------------------------------------------------------------------
# LifecycleEventType
# ---------------------------------------------------------------------------


class TestLifecycleEventType:
    def test_is_str_enum(self) -> None:
        assert issubclass(LifecycleEventType, str)

    def test_procured_value(self) -> None:
        assert LifecycleEventType.procured == "procured"

    def test_deployed_value(self) -> None:
        assert LifecycleEventType.deployed == "deployed"

    def test_disposed_value(self) -> None:
        assert LifecycleEventType.disposed == "disposed"

    def test_disposal_requested_value(self) -> None:
        assert LifecycleEventType.disposal_requested == "disposal_requested"

    def test_member_count(self) -> None:
        assert len(LifecycleEventType) == 7

    def test_all_values_are_strings(self) -> None:
        for member in LifecycleEventType:
            assert isinstance(member.value, str)


# ---------------------------------------------------------------------------
# DisposalMethod
# ---------------------------------------------------------------------------


class TestDisposalMethod:
    def test_is_str_enum(self) -> None:
        assert issubclass(DisposalMethod, str)

    def test_recycle_value(self) -> None:
        assert DisposalMethod.recycle == "recycle"

    def test_destroy_value(self) -> None:
        assert DisposalMethod.destroy == "destroy"

    def test_donate_value(self) -> None:
        assert DisposalMethod.donate == "donate"

    def test_return_to_vendor_value(self) -> None:
        assert DisposalMethod.return_to_vendor == "return_to_vendor"

    def test_member_count(self) -> None:
        assert len(DisposalMethod) == 4


# ---------------------------------------------------------------------------
# DisposalStatus
# ---------------------------------------------------------------------------


class TestDisposalStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(DisposalStatus, str)

    def test_pending_value(self) -> None:
        assert DisposalStatus.pending == "pending"

    def test_approved_value(self) -> None:
        assert DisposalStatus.approved == "approved"

    def test_rejected_value(self) -> None:
        assert DisposalStatus.rejected == "rejected"

    def test_completed_value(self) -> None:
        assert DisposalStatus.completed == "completed"

    def test_member_count(self) -> None:
        assert len(DisposalStatus) == 4


# ---------------------------------------------------------------------------
# SnapshotType
# ---------------------------------------------------------------------------


class TestSnapshotType:
    def test_is_str_enum(self) -> None:
        assert issubclass(SnapshotType, str)

    def test_hardware_value(self) -> None:
        assert SnapshotType.hardware == "hardware"

    def test_software_value(self) -> None:
        assert SnapshotType.software == "software"

    def test_security_value(self) -> None:
        assert SnapshotType.security == "security"

    def test_network_value(self) -> None:
        assert SnapshotType.network == "network"

    def test_member_count(self) -> None:
        assert len(SnapshotType) == 4


# ---------------------------------------------------------------------------
# ChangeType
# ---------------------------------------------------------------------------


class TestChangeType:
    def test_is_str_enum(self) -> None:
        assert issubclass(ChangeType, str)

    def test_added_value(self) -> None:
        assert ChangeType.added == "added"

    def test_modified_value(self) -> None:
        assert ChangeType.modified == "modified"

    def test_removed_value(self) -> None:
        assert ChangeType.removed == "removed"

    def test_member_count(self) -> None:
        assert len(ChangeType) == 3


# ---------------------------------------------------------------------------
# DeviceStatus
# ---------------------------------------------------------------------------


class TestDeviceStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(DeviceStatus, str)

    def test_active_value(self) -> None:
        assert DeviceStatus.active == "active"

    def test_inactive_value(self) -> None:
        assert DeviceStatus.inactive == "inactive"

    def test_decommissioned_value(self) -> None:
        assert DeviceStatus.decommissioned == "decommissioned"

    def test_maintenance_value(self) -> None:
        assert DeviceStatus.maintenance == "maintenance"

    def test_member_count(self) -> None:
        assert len(DeviceStatus) == 4


# ---------------------------------------------------------------------------
# DLPRuleType
# ---------------------------------------------------------------------------


class TestDLPRuleType:
    def test_is_str_enum(self) -> None:
        assert issubclass(DLPRuleType, str)

    def test_file_extension_value(self) -> None:
        assert DLPRuleType.file_extension == "file_extension"

    def test_path_pattern_value(self) -> None:
        assert DLPRuleType.path_pattern == "path_pattern"

    def test_content_keyword_value(self) -> None:
        assert DLPRuleType.content_keyword == "content_keyword"

    def test_size_limit_value(self) -> None:
        assert DLPRuleType.size_limit == "size_limit"

    def test_member_count(self) -> None:
        assert len(DLPRuleType) == 4


# ---------------------------------------------------------------------------
# DLPAction
# ---------------------------------------------------------------------------


class TestDLPAction:
    def test_is_str_enum(self) -> None:
        assert issubclass(DLPAction, str)

    def test_alert_value(self) -> None:
        assert DLPAction.alert == "alert"

    def test_block_value(self) -> None:
        assert DLPAction.block == "block"

    def test_log_value(self) -> None:
        assert DLPAction.log == "log"

    def test_member_count(self) -> None:
        assert len(DLPAction) == 3


# ---------------------------------------------------------------------------
# DLPSeverity
# ---------------------------------------------------------------------------


class TestDLPSeverity:
    def test_is_str_enum(self) -> None:
        assert issubclass(DLPSeverity, str)

    def test_critical_value(self) -> None:
        assert DLPSeverity.critical == "critical"

    def test_high_value(self) -> None:
        assert DLPSeverity.high == "high"

    def test_medium_value(self) -> None:
        assert DLPSeverity.medium == "medium"

    def test_low_value(self) -> None:
        assert DLPSeverity.low == "low"

    def test_member_count(self) -> None:
        assert len(DLPSeverity) == 4


# ---------------------------------------------------------------------------
# DLPActionTaken
# ---------------------------------------------------------------------------


class TestDLPActionTaken:
    def test_is_str_enum(self) -> None:
        assert issubclass(DLPActionTaken, str)

    def test_alerted_value(self) -> None:
        assert DLPActionTaken.alerted == "alerted"

    def test_blocked_value(self) -> None:
        assert DLPActionTaken.blocked == "blocked"

    def test_logged_value(self) -> None:
        assert DLPActionTaken.logged == "logged"

    def test_member_count(self) -> None:
        assert len(DLPActionTaken) == 3


# ---------------------------------------------------------------------------
# AssignmentType
# ---------------------------------------------------------------------------


class TestAssignmentType:
    def test_is_str_enum(self) -> None:
        assert issubclass(AssignmentType, str)

    def test_static_value(self) -> None:
        assert AssignmentType.static == "static"

    def test_dhcp_value(self) -> None:
        assert AssignmentType.dhcp == "dhcp"

    def test_reserved_value(self) -> None:
        assert AssignmentType.reserved == "reserved"

    def test_member_count(self) -> None:
        assert len(AssignmentType) == 3


# ---------------------------------------------------------------------------
# AssignmentStatus
# ---------------------------------------------------------------------------


class TestAssignmentStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(AssignmentStatus, str)

    def test_active_value(self) -> None:
        assert AssignmentStatus.active == "active"

    def test_inactive_value(self) -> None:
        assert AssignmentStatus.inactive == "inactive"

    def test_reserved_value(self) -> None:
        assert AssignmentStatus.reserved == "reserved"

    def test_conflict_value(self) -> None:
        assert AssignmentStatus.conflict == "conflict"

    def test_member_count(self) -> None:
        assert len(AssignmentStatus) == 4
