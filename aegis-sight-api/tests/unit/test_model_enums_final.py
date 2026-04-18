"""Unit tests for security domain model Enum classes (final batch) — no DB required."""

from app.models.knowledge_base import ArticleCategory, ArticleStatus
from app.models.license import LicenseType
from app.models.log_event import FileAction, UsbAction
from app.models.network_device import NetworkDeviceType
from app.models.notification_channel import ChannelType, NotificationEventType
from app.models.patch import PatchStatus, UpdateSeverity, VulnerabilitySeverity
from app.models.policy import PolicyType
from app.models.scheduled_task import TaskStatus, TaskType
from app.models.user import UserRole

# ---------------------------------------------------------------------------
# ArticleCategory
# ---------------------------------------------------------------------------


class TestArticleCategory:
    def test_is_str_enum(self) -> None:
        assert issubclass(ArticleCategory, str)

    def test_how_to_value(self) -> None:
        assert ArticleCategory.how_to == "how_to"

    def test_troubleshooting_value(self) -> None:
        assert ArticleCategory.troubleshooting == "troubleshooting"

    def test_policy_value(self) -> None:
        assert ArticleCategory.policy == "policy"

    def test_faq_value(self) -> None:
        assert ArticleCategory.faq == "faq"

    def test_best_practice_value(self) -> None:
        assert ArticleCategory.best_practice == "best_practice"

    def test_member_count(self) -> None:
        assert len(ArticleCategory) == 5


# ---------------------------------------------------------------------------
# ArticleStatus
# ---------------------------------------------------------------------------


class TestArticleStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(ArticleStatus, str)

    def test_draft_value(self) -> None:
        assert ArticleStatus.draft == "draft"

    def test_published_value(self) -> None:
        assert ArticleStatus.published == "published"

    def test_archived_value(self) -> None:
        assert ArticleStatus.archived == "archived"

    def test_member_count(self) -> None:
        assert len(ArticleStatus) == 3


# ---------------------------------------------------------------------------
# LicenseType
# ---------------------------------------------------------------------------


class TestLicenseType:
    def test_is_str_enum(self) -> None:
        assert issubclass(LicenseType, str)

    def test_perpetual_value(self) -> None:
        assert LicenseType.perpetual == "perpetual"

    def test_subscription_value(self) -> None:
        assert LicenseType.subscription == "subscription"

    def test_oem_value(self) -> None:
        assert LicenseType.oem == "oem"

    def test_volume_value(self) -> None:
        assert LicenseType.volume == "volume"

    def test_freeware_value(self) -> None:
        assert LicenseType.freeware == "freeware"

    def test_open_source_value(self) -> None:
        assert LicenseType.open_source == "open_source"

    def test_member_count(self) -> None:
        assert len(LicenseType) == 6


# ---------------------------------------------------------------------------
# UsbAction
# ---------------------------------------------------------------------------


class TestUsbAction:
    def test_is_str_enum(self) -> None:
        assert issubclass(UsbAction, str)

    def test_connected_value(self) -> None:
        assert UsbAction.connected == "connected"

    def test_disconnected_value(self) -> None:
        assert UsbAction.disconnected == "disconnected"

    def test_member_count(self) -> None:
        assert len(UsbAction) == 2


# ---------------------------------------------------------------------------
# FileAction
# ---------------------------------------------------------------------------


class TestFileAction:
    def test_is_str_enum(self) -> None:
        assert issubclass(FileAction, str)

    def test_create_value(self) -> None:
        assert FileAction.create == "create"

    def test_modify_value(self) -> None:
        assert FileAction.modify == "modify"

    def test_delete_value(self) -> None:
        assert FileAction.delete == "delete"

    def test_read_value(self) -> None:
        assert FileAction.read == "read"

    def test_member_count(self) -> None:
        assert len(FileAction) == 4


# ---------------------------------------------------------------------------
# NetworkDeviceType
# ---------------------------------------------------------------------------


class TestNetworkDeviceType:
    def test_is_str_enum(self) -> None:
        assert issubclass(NetworkDeviceType, str)

    def test_pc_value(self) -> None:
        assert NetworkDeviceType.pc == "pc"

    def test_server_value(self) -> None:
        assert NetworkDeviceType.server == "server"

    def test_printer_value(self) -> None:
        assert NetworkDeviceType.printer == "printer"

    def test_unknown_value(self) -> None:
        assert NetworkDeviceType.unknown == "unknown"

    def test_member_count(self) -> None:
        assert len(NetworkDeviceType) == 7


# ---------------------------------------------------------------------------
# ChannelType
# ---------------------------------------------------------------------------


class TestChannelType:
    def test_is_str_enum(self) -> None:
        assert issubclass(ChannelType, str)

    def test_email_value(self) -> None:
        assert ChannelType.email == "email"

    def test_webhook_value(self) -> None:
        assert ChannelType.webhook == "webhook"

    def test_slack_value(self) -> None:
        assert ChannelType.slack == "slack"

    def test_teams_value(self) -> None:
        assert ChannelType.teams == "teams"

    def test_member_count(self) -> None:
        assert len(ChannelType) == 4


# ---------------------------------------------------------------------------
# NotificationEventType
# ---------------------------------------------------------------------------


class TestNotificationEventType:
    def test_is_str_enum(self) -> None:
        assert issubclass(NotificationEventType, str)

    def test_alert_critical_value(self) -> None:
        assert NotificationEventType.alert_critical == "alert_critical"

    def test_security_incident_value(self) -> None:
        assert NotificationEventType.security_incident == "security_incident"

    def test_license_expiry_value(self) -> None:
        assert NotificationEventType.license_expiry == "license_expiry"

    def test_member_count(self) -> None:
        assert len(NotificationEventType) == 6


# ---------------------------------------------------------------------------
# UpdateSeverity
# ---------------------------------------------------------------------------


class TestUpdateSeverity:
    def test_is_str_enum(self) -> None:
        assert issubclass(UpdateSeverity, str)

    def test_critical_value(self) -> None:
        assert UpdateSeverity.critical == "critical"

    def test_important_value(self) -> None:
        assert UpdateSeverity.important == "important"

    def test_moderate_value(self) -> None:
        assert UpdateSeverity.moderate == "moderate"

    def test_low_value(self) -> None:
        assert UpdateSeverity.low == "low"

    def test_member_count(self) -> None:
        assert len(UpdateSeverity) == 4


# ---------------------------------------------------------------------------
# PatchStatus
# ---------------------------------------------------------------------------


class TestPatchStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(PatchStatus, str)

    def test_not_installed_value(self) -> None:
        assert PatchStatus.not_installed == "not_installed"

    def test_installed_value(self) -> None:
        assert PatchStatus.installed == "installed"

    def test_failed_value(self) -> None:
        assert PatchStatus.failed == "failed"

    def test_not_applicable_value(self) -> None:
        assert PatchStatus.not_applicable == "not_applicable"

    def test_member_count(self) -> None:
        assert len(PatchStatus) == 5


# ---------------------------------------------------------------------------
# VulnerabilitySeverity
# ---------------------------------------------------------------------------


class TestVulnerabilitySeverity:
    def test_is_str_enum(self) -> None:
        assert issubclass(VulnerabilitySeverity, str)

    def test_critical_value(self) -> None:
        assert VulnerabilitySeverity.critical == "critical"

    def test_high_value(self) -> None:
        assert VulnerabilitySeverity.high == "high"

    def test_medium_value(self) -> None:
        assert VulnerabilitySeverity.medium == "medium"

    def test_low_value(self) -> None:
        assert VulnerabilitySeverity.low == "low"

    def test_member_count(self) -> None:
        assert len(VulnerabilitySeverity) == 4


# ---------------------------------------------------------------------------
# PolicyType
# ---------------------------------------------------------------------------


class TestPolicyType:
    def test_is_str_enum(self) -> None:
        assert issubclass(PolicyType, str)

    def test_usb_control_value(self) -> None:
        assert PolicyType.usb_control == "usb_control"

    def test_software_restriction_value(self) -> None:
        assert PolicyType.software_restriction == "software_restriction"

    def test_patch_requirement_value(self) -> None:
        assert PolicyType.patch_requirement == "patch_requirement"

    def test_security_baseline_value(self) -> None:
        assert PolicyType.security_baseline == "security_baseline"

    def test_member_count(self) -> None:
        assert len(PolicyType) == 4


# ---------------------------------------------------------------------------
# TaskType
# ---------------------------------------------------------------------------


class TestTaskType:
    def test_is_str_enum(self) -> None:
        assert issubclass(TaskType, str)

    def test_sam_check_value(self) -> None:
        assert TaskType.sam_check == "sam_check"

    def test_m365_sync_value(self) -> None:
        assert TaskType.m365_sync == "m365_sync"

    def test_backup_value(self) -> None:
        assert TaskType.backup == "backup"

    def test_cleanup_value(self) -> None:
        assert TaskType.cleanup == "cleanup"

    def test_member_count(self) -> None:
        assert len(TaskType) == 5


# ---------------------------------------------------------------------------
# TaskStatus
# ---------------------------------------------------------------------------


class TestTaskStatus:
    def test_is_str_enum(self) -> None:
        assert issubclass(TaskStatus, str)

    def test_success_value(self) -> None:
        assert TaskStatus.success == "success"

    def test_failed_value(self) -> None:
        assert TaskStatus.failed == "failed"

    def test_running_value(self) -> None:
        assert TaskStatus.running == "running"

    def test_member_count(self) -> None:
        assert len(TaskStatus) == 3


# ---------------------------------------------------------------------------
# UserRole
# ---------------------------------------------------------------------------


class TestUserRole:
    def test_is_str_enum(self) -> None:
        assert issubclass(UserRole, str)

    def test_admin_value(self) -> None:
        assert UserRole.admin == "admin"

    def test_operator_value(self) -> None:
        assert UserRole.operator == "operator"

    def test_admin_not_equal_operator(self) -> None:
        assert UserRole.admin != UserRole.operator
