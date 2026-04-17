"""Unit tests for app/services/notification_service.py."""

from __future__ import annotations

import inspect
from unittest.mock import AsyncMock, patch

from app.services.notification_service import NotificationService


class TestNotificationServiceStructure:
    def test_is_class(self) -> None:
        assert isinstance(NotificationService, type)

    def test_send_email_is_static(self) -> None:
        assert isinstance(
            inspect.getattr_static(NotificationService, "send_email"), staticmethod
        )

    def test_send_webhook_is_static(self) -> None:
        assert isinstance(
            inspect.getattr_static(NotificationService, "send_webhook"), staticmethod
        )

    def test_notify_license_violation_is_static(self) -> None:
        assert isinstance(
            inspect.getattr_static(NotificationService, "notify_license_violation"),
            staticmethod,
        )

    def test_notify_security_alert_is_static(self) -> None:
        assert isinstance(
            inspect.getattr_static(NotificationService, "notify_security_alert"),
            staticmethod,
        )

    def test_send_email_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(NotificationService.send_email)

    def test_send_webhook_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(NotificationService.send_webhook)

    def test_notify_license_violation_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(NotificationService.notify_license_violation)

    def test_notify_security_alert_is_coroutine(self) -> None:
        assert inspect.iscoroutinefunction(NotificationService.notify_security_alert)


class TestSendEmailNoSmtpHost:
    async def test_returns_false_when_smtp_host_is_none(self) -> None:
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = None
            result = await NotificationService.send_email(
                "user@example.com", "Subject", "Body"
            )
        assert result is False

    async def test_returns_false_when_smtp_host_missing(self) -> None:
        # getattr default branch: settings has no SMTP_HOST attribute at all
        class _Settings:
            pass

        with patch("app.services.notification_service.settings", _Settings()):
            result = await NotificationService.send_email(
                "user@example.com", "Subject", "Body"
            )
        assert result is False


class TestNotifyLicenseViolation:
    async def test_empty_violations_returns_none(self) -> None:
        result = await NotificationService.notify_license_violation([])
        assert result is None

    async def test_no_email_or_webhook_configured_does_not_raise(self) -> None:
        violations = [
            {
                "software_name": "OfficeApp",
                "purchased_count": 10,
                "total_used": 15,
                "over_deployed": 5,
            }
        ]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = None
            # Should complete without raising even with no destinations
            result = await NotificationService.notify_license_violation(violations)
        assert result is None

    async def test_email_sent_when_admin_email_configured(self) -> None:
        violations = [{"software_name": "App", "purchased_count": 5, "total_used": 6, "over_deployed": 1}]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                await NotificationService.notify_license_violation(violations)
        mock_email.assert_called_once()
        call_kwargs = mock_email.call_args
        assert "admin@example.com" in call_kwargs.args

    async def test_subject_contains_violation_count(self) -> None:
        violations = [
            {"software_name": "App1", "purchased_count": 5, "total_used": 6, "over_deployed": 1},
            {"software_name": "App2", "purchased_count": 3, "total_used": 5, "over_deployed": 2},
        ]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                await NotificationService.notify_license_violation(violations)
        subject = mock_email.call_args.args[1]
        assert "2" in subject


class TestNotifySecurityAlert:
    async def test_no_destinations_does_not_raise(self) -> None:
        alert = {
            "title": "Suspicious Login",
            "severity": "high",
            "description": "Login from unknown IP",
            "device_id": "dev-001",
        }
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = None
            result = await NotificationService.notify_security_alert(alert)
        assert result is None

    async def test_subject_contains_severity_uppercased(self) -> None:
        alert = {"title": "Port Scan", "severity": "critical", "description": "", "device_id": ""}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                await NotificationService.notify_security_alert(alert)
        subject = mock_email.call_args.args[1]
        assert "CRITICAL" in subject

    async def test_subject_contains_alert_title(self) -> None:
        alert = {"title": "Malware Detected", "severity": "high", "description": ""}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                await NotificationService.notify_security_alert(alert)
        subject = mock_email.call_args.args[1]
        assert "Malware Detected" in subject

    async def test_default_severity_is_unknown(self) -> None:
        # alert dict without 'severity' key
        alert = {"title": "Test Alert", "description": ""}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                await NotificationService.notify_security_alert(alert)
        subject = mock_email.call_args.args[1]
        assert "UNKNOWN" in subject
