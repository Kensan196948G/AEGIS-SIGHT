"""Tests for localized message constants."""

from __future__ import annotations

import pytest

from app.core.messages import (
    AuditMessages,
    DeviceMessages,
    ErrorMessages,
    LicenseMessages,
    NotificationMessages,
    ProcurementMessages,
    SecurityMessages,
)


# ===================================================================
# ErrorMessages
# ===================================================================
class TestErrorMessages:
    """Verify all error message constants are non-empty Japanese strings."""

    @pytest.mark.parametrize(
        "attr,expected",
        [
            ("NOT_FOUND", "リソースが見つかりません"),
            ("FORBIDDEN", "アクセスが拒否されました"),
            ("UNAUTHORIZED", "認証が必要です"),
            ("CONFLICT", "リソースが競合しています"),
            ("VALIDATION_ERROR", "入力値が不正です"),
            ("RATE_LIMITED", "リクエスト制限を超過しました"),
            ("SERVER_ERROR", "内部サーバーエラーが発生しました"),
            ("BAD_REQUEST", "不正なリクエストです"),
            ("SERVICE_UNAVAILABLE", "サービスが一時的に利用できません"),
            ("TIMEOUT", "リクエストがタイムアウトしました"),
        ],
    )
    def test_error_message_value(self, attr: str, expected: str):
        assert getattr(ErrorMessages, attr) == expected

    def test_all_error_messages_are_strings(self):
        for attr in dir(ErrorMessages):
            if attr.isupper():
                assert isinstance(getattr(ErrorMessages, attr), str)


# ===================================================================
# LicenseMessages
# ===================================================================
class TestLicenseMessages:
    def test_license_over_format(self):
        msg = LicenseMessages.LICENSE_OVER.format(software="Microsoft Office")
        assert "Microsoft Office" in msg
        assert "超過" in msg

    def test_license_expiring_format(self):
        msg = LicenseMessages.LICENSE_EXPIRING.format(software="Adobe CC")
        assert "Adobe CC" in msg
        assert "有効期限" in msg

    def test_license_expired_format(self):
        msg = LicenseMessages.LICENSE_EXPIRED.format(software="Visual Studio")
        assert "Visual Studio" in msg
        assert "切れています" in msg

    def test_license_compliant_format(self):
        msg = LicenseMessages.LICENSE_COMPLIANT.format(software="Python")
        assert "Python" in msg
        assert "適正" in msg

    def test_license_not_found_format(self):
        msg = LicenseMessages.LICENSE_NOT_FOUND.format(software="Unknown")
        assert "Unknown" in msg


# ===================================================================
# ProcurementMessages
# ===================================================================
class TestProcurementMessages:
    def test_invalid_transition_format(self):
        msg = ProcurementMessages.PROCUREMENT_INVALID_TRANSITION.format(
            from_status="draft", to_status="completed"
        )
        assert "draft" in msg
        assert "completed" in msg
        assert "不正" in msg

    def test_created_format(self):
        msg = ProcurementMessages.PROCUREMENT_CREATED.format(title="新規PC")
        assert "新規PC" in msg
        assert "作成" in msg

    def test_approved_format(self):
        msg = ProcurementMessages.PROCUREMENT_APPROVED.format(title="サーバー")
        assert "承認" in msg

    def test_rejected_format(self):
        msg = ProcurementMessages.PROCUREMENT_REJECTED.format(title="テスト")
        assert "却下" in msg

    def test_budget_exceeded_format(self):
        msg = ProcurementMessages.PROCUREMENT_BUDGET_EXCEEDED.format(
            amount="1,000,000"
        )
        assert "予算" in msg


# ===================================================================
# DeviceMessages
# ===================================================================
class TestDeviceMessages:
    def test_device_offline_format(self):
        msg = DeviceMessages.DEVICE_OFFLINE.format(hostname="PC-001")
        assert "PC-001" in msg
        assert "オフライン" in msg

    def test_device_not_found_format(self):
        msg = DeviceMessages.DEVICE_NOT_FOUND.format(hostname="SRV-WEB")
        assert "SRV-WEB" in msg

    def test_device_registered_format(self):
        msg = DeviceMessages.DEVICE_REGISTERED.format(hostname="NEW-PC")
        assert "登録" in msg

    def test_device_retired_format(self):
        msg = DeviceMessages.DEVICE_RETIRED.format(hostname="OLD-PC")
        assert "廃棄" in msg

    def test_device_duplicate_mac_format(self):
        msg = DeviceMessages.DEVICE_DUPLICATE_MAC.format(
            mac_address="AA:BB:CC:DD:EE:FF"
        )
        assert "AA:BB:CC:DD:EE:FF" in msg


# ===================================================================
# SecurityMessages
# ===================================================================
class TestSecurityMessages:
    def test_defender_disabled(self):
        msg = SecurityMessages.DEFENDER_DISABLED.format(hostname="PC-RISK")
        assert "Defender" in msg
        assert "PC-RISK" in msg

    def test_bitlocker_disabled(self):
        msg = SecurityMessages.BITLOCKER_DISABLED.format(hostname="LAPTOP-01")
        assert "BitLocker" in msg

    def test_patch_overdue(self):
        msg = SecurityMessages.PATCH_OVERDUE.format(hostname="SRV-DB")
        assert "パッチ" in msg

    def test_unauthorized_software(self):
        msg = SecurityMessages.UNAUTHORIZED_SOFTWARE.format(software="TorBrowser")
        assert "未許可" in msg


# ===================================================================
# AuditMessages
# ===================================================================
class TestAuditMessages:
    def test_login(self):
        msg = AuditMessages.AUDIT_LOGIN.format(user="admin@example.com")
        assert "ログイン" in msg

    def test_permission_changed(self):
        msg = AuditMessages.AUDIT_PERMISSION_CHANGED.format(
            user="user@example.com", role="admin"
        )
        assert "権限" in msg
        assert "admin" in msg

    def test_data_exported(self):
        msg = AuditMessages.AUDIT_DATA_EXPORTED.format(resource="assets")
        assert "エクスポート" in msg


# ===================================================================
# NotificationMessages
# ===================================================================
class TestNotificationMessages:
    def test_sent(self):
        msg = NotificationMessages.NOTIFICATION_SENT.format(subject="テスト通知")
        assert "送信" in msg

    def test_failed(self):
        msg = NotificationMessages.NOTIFICATION_FAILED.format(subject="アラート")
        assert "失敗" in msg

    def test_threshold(self):
        msg = NotificationMessages.NOTIFICATION_THRESHOLD.format(
            metric="CPU使用率", value="95%"
        )
        assert "しきい値" in msg
        assert "95%" in msg
