"""Unit tests for app/core/messages.py — localized message constants."""

from app.core.messages import (
    AuditMessages,
    DeviceMessages,
    ErrorMessages,
    LicenseMessages,
    NotificationMessages,
    ProcurementMessages,
    SecurityMessages,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _public_str_attrs(cls: type) -> dict[str, str]:
    """Return {name: value} for all public string class attributes."""
    return {
        k: v
        for k, v in vars(cls).items()
        if not k.startswith("_") and isinstance(v, str)
    }


# ---------------------------------------------------------------------------
# ErrorMessages
# ---------------------------------------------------------------------------


class TestErrorMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(ErrorMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_not_found(self) -> None:
        assert ErrorMessages.NOT_FOUND == "リソースが見つかりません"

    def test_forbidden(self) -> None:
        assert ErrorMessages.FORBIDDEN == "アクセスが拒否されました"

    def test_unauthorized(self) -> None:
        assert ErrorMessages.UNAUTHORIZED == "認証が必要です"

    def test_conflict(self) -> None:
        assert ErrorMessages.CONFLICT == "リソースが競合しています"

    def test_validation_error(self) -> None:
        assert ErrorMessages.VALIDATION_ERROR == "入力値が不正です"

    def test_rate_limited(self) -> None:
        assert ErrorMessages.RATE_LIMITED == "リクエスト制限を超過しました"

    def test_server_error(self) -> None:
        assert ErrorMessages.SERVER_ERROR == "内部サーバーエラーが発生しました"

    def test_bad_request(self) -> None:
        assert ErrorMessages.BAD_REQUEST == "不正なリクエストです"

    def test_service_unavailable(self) -> None:
        assert ErrorMessages.SERVICE_UNAVAILABLE == "サービスが一時的に利用できません"

    def test_timeout(self) -> None:
        assert ErrorMessages.TIMEOUT == "リクエストがタイムアウトしました"

    def test_count(self) -> None:
        assert len(_public_str_attrs(ErrorMessages)) == 10


# ---------------------------------------------------------------------------
# LicenseMessages
# ---------------------------------------------------------------------------


class TestLicenseMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(LicenseMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_license_over_format(self) -> None:
        result = LicenseMessages.LICENSE_OVER.format(software="MS Office")
        assert "MS Office" in result
        assert "超過" in result

    def test_license_expiring_format(self) -> None:
        result = LicenseMessages.LICENSE_EXPIRING.format(software="Adobe CC")
        assert "Adobe CC" in result
        assert "有効期限" in result

    def test_license_expired_format(self) -> None:
        result = LicenseMessages.LICENSE_EXPIRED.format(software="Slack")
        assert "Slack" in result
        assert "切れています" in result

    def test_license_compliant_format(self) -> None:
        result = LicenseMessages.LICENSE_COMPLIANT.format(software="Zoom")
        assert "Zoom" in result
        assert "適正" in result

    def test_license_not_found_format(self) -> None:
        result = LicenseMessages.LICENSE_NOT_FOUND.format(software="Teams")
        assert "Teams" in result
        assert "見つかりません" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(LicenseMessages)) == 5


# ---------------------------------------------------------------------------
# ProcurementMessages
# ---------------------------------------------------------------------------


class TestProcurementMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(ProcurementMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_invalid_transition_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_INVALID_TRANSITION.format(
            from_status="draft", to_status="completed"
        )
        assert "draft" in result
        assert "completed" in result

    def test_created_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_CREATED.format(title="PC購入")
        assert "PC購入" in result

    def test_approved_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_APPROVED.format(title="サーバー増設")
        assert "サーバー増設" in result
        assert "承認" in result

    def test_rejected_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_REJECTED.format(title="不明な申請")
        assert "不明な申請" in result
        assert "却下" in result

    def test_completed_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_COMPLETED.format(title="完了申請")
        assert "完了" in result

    def test_budget_exceeded_format(self) -> None:
        result = ProcurementMessages.PROCUREMENT_BUDGET_EXCEEDED.format(amount="100万円")
        assert "100万円" in result
        assert "超過" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(ProcurementMessages)) == 6


# ---------------------------------------------------------------------------
# DeviceMessages
# ---------------------------------------------------------------------------


class TestDeviceMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(DeviceMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_device_offline_format(self) -> None:
        result = DeviceMessages.DEVICE_OFFLINE.format(hostname="PC-001")
        assert "PC-001" in result
        assert "オフライン" in result

    def test_device_not_found_format(self) -> None:
        result = DeviceMessages.DEVICE_NOT_FOUND.format(hostname="server-01")
        assert "server-01" in result

    def test_device_registered_format(self) -> None:
        result = DeviceMessages.DEVICE_REGISTERED.format(hostname="new-device")
        assert "new-device" in result
        assert "登録" in result

    def test_device_retired_format(self) -> None:
        result = DeviceMessages.DEVICE_RETIRED.format(hostname="old-pc")
        assert "old-pc" in result
        assert "廃棄" in result

    def test_device_maintenance_format(self) -> None:
        result = DeviceMessages.DEVICE_MAINTENANCE.format(hostname="maint-host")
        assert "maint-host" in result
        assert "メンテナンス" in result

    def test_device_duplicate_mac_format(self) -> None:
        result = DeviceMessages.DEVICE_DUPLICATE_MAC.format(mac_address="AA:BB:CC:DD:EE:FF")
        assert "AA:BB:CC:DD:EE:FF" in result
        assert "重複" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(DeviceMessages)) == 6


# ---------------------------------------------------------------------------
# SecurityMessages
# ---------------------------------------------------------------------------


class TestSecurityMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(SecurityMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_defender_disabled_format(self) -> None:
        result = SecurityMessages.DEFENDER_DISABLED.format(hostname="win-host")
        assert "win-host" in result
        assert "Defender" in result

    def test_bitlocker_disabled_format(self) -> None:
        result = SecurityMessages.BITLOCKER_DISABLED.format(hostname="laptop-01")
        assert "laptop-01" in result
        assert "BitLocker" in result

    def test_patch_overdue_format(self) -> None:
        result = SecurityMessages.PATCH_OVERDUE.format(hostname="patch-host")
        assert "patch-host" in result
        assert "パッチ" in result

    def test_security_alert_format(self) -> None:
        result = SecurityMessages.SECURITY_ALERT.format(hostname="alert-host")
        assert "alert-host" in result
        assert "アラート" in result

    def test_unauthorized_software_format(self) -> None:
        result = SecurityMessages.UNAUTHORIZED_SOFTWARE.format(software="TorrentApp")
        assert "TorrentApp" in result
        assert "未許可" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(SecurityMessages)) == 5


# ---------------------------------------------------------------------------
# AuditMessages
# ---------------------------------------------------------------------------


class TestAuditMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(AuditMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_audit_login_format(self) -> None:
        result = AuditMessages.AUDIT_LOGIN.format(user="admin@example.com")
        assert "admin@example.com" in result
        assert "ログイン" in result

    def test_audit_logout_format(self) -> None:
        result = AuditMessages.AUDIT_LOGOUT.format(user="user1")
        assert "user1" in result
        assert "ログアウト" in result

    def test_audit_permission_changed_format(self) -> None:
        result = AuditMessages.AUDIT_PERMISSION_CHANGED.format(user="user2", role="admin")
        assert "user2" in result
        assert "admin" in result
        assert "権限" in result

    def test_audit_data_exported_format(self) -> None:
        result = AuditMessages.AUDIT_DATA_EXPORTED.format(resource="devices")
        assert "devices" in result
        assert "エクスポート" in result

    def test_audit_config_changed_format(self) -> None:
        result = AuditMessages.AUDIT_CONFIG_CHANGED.format(key="MAX_RETRIES")
        assert "MAX_RETRIES" in result
        assert "設定" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(AuditMessages)) == 5


# ---------------------------------------------------------------------------
# NotificationMessages
# ---------------------------------------------------------------------------


class TestNotificationMessages:
    def test_all_values_are_strings(self) -> None:
        for name, val in _public_str_attrs(NotificationMessages).items():
            assert isinstance(val, str), f"{name} is not str"

    def test_notification_sent_format(self) -> None:
        result = NotificationMessages.NOTIFICATION_SENT.format(subject="テストメール")
        assert "テストメール" in result
        assert "送信" in result

    def test_notification_failed_format(self) -> None:
        result = NotificationMessages.NOTIFICATION_FAILED.format(subject="失敗メール")
        assert "失敗メール" in result
        assert "失敗" in result

    def test_notification_threshold_format(self) -> None:
        result = NotificationMessages.NOTIFICATION_THRESHOLD.format(
            metric="CPU使用率", value="95%"
        )
        assert "CPU使用率" in result
        assert "95%" in result
        assert "しきい値" in result

    def test_count(self) -> None:
        assert len(_public_str_attrs(NotificationMessages)) == 3
