"""Extended unit tests for NotificationService — send_webhook, send_email SMTP paths, and domain helpers with webhook."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.services.notification_service import NotificationService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_smtp_mock(raise_on: str | None = None) -> MagicMock:
    """Return a MagicMock that mimics smtplib.SMTP context manager."""
    server = MagicMock()
    if raise_on == "login":
        server.login.side_effect = Exception("Auth failed")
    elif raise_on == "sendmail":
        server.sendmail.side_effect = Exception("SMTP send failed")
    elif raise_on == "connect":
        raise Exception("Connection refused")

    smtp_cm = MagicMock()
    smtp_cm.__enter__ = MagicMock(return_value=server)
    smtp_cm.__exit__ = MagicMock(return_value=False)
    return smtp_cm, server


def _make_transport(status_code: int) -> httpx.MockTransport:
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code)

    return httpx.MockTransport(handler)


# ---------------------------------------------------------------------------
# send_webhook — success
# ---------------------------------------------------------------------------


class TestSendWebhookSuccess:
    async def test_returns_true_on_200(self) -> None:
        transport = _make_transport(200)
        with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
            result = await NotificationService.send_webhook("https://hook.example.com/events", {"key": "val"})
        assert result is True

    async def test_returns_true_on_201(self) -> None:
        transport = _make_transport(201)
        with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
            result = await NotificationService.send_webhook("https://hook.example.com/events", {})
        assert result is True

    async def test_returns_true_on_204(self) -> None:
        transport = _make_transport(204)
        with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
            result = await NotificationService.send_webhook("https://hook.example.com/events", {})
        assert result is True


# ---------------------------------------------------------------------------
# send_webhook — failure
# ---------------------------------------------------------------------------


class TestSendWebhookFailure:
    async def test_returns_false_on_400(self) -> None:
        transport = _make_transport(400)
        with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
            result = await NotificationService.send_webhook("https://hook.example.com/bad", {})
        assert result is False

    async def test_returns_false_on_500(self) -> None:
        transport = _make_transport(500)
        with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
            result = await NotificationService.send_webhook("https://hook.example.com/err", {})
        assert result is False

    async def test_returns_false_on_network_exception(self) -> None:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("timeout"))

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await NotificationService.send_webhook("https://hook.example.com/timeout", {})
        assert result is False

    async def test_returns_false_on_generic_exception(self) -> None:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=RuntimeError("unexpected"))

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await NotificationService.send_webhook("https://hook.example.com/err", {})
        assert result is False


# ---------------------------------------------------------------------------
# send_email — SMTP success path
# ---------------------------------------------------------------------------


class TestSendEmailSmtpSuccess:
    async def test_returns_true_on_smtp_success(self) -> None:
        smtp_cm, _ = _make_smtp_mock()
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = "user@example.com"
            mock_settings.SMTP_PASSWORD = "secret"
            mock_settings.SMTP_FROM = "from@example.com"
            with patch("smtplib.SMTP", return_value=smtp_cm):
                result = await NotificationService.send_email(
                    "to@example.com", "Test Subject", "Test Body"
                )
        assert result is True

    async def test_starttls_called_on_port_587(self) -> None:
        smtp_cm, server = _make_smtp_mock()
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = None
            mock_settings.SMTP_PASSWORD = None
            mock_settings.SMTP_FROM = None
            with patch("smtplib.SMTP", return_value=smtp_cm):
                await NotificationService.send_email("to@example.com", "Subject", "Body")
        server.starttls.assert_called_once()

    async def test_starttls_not_called_on_port_25(self) -> None:
        smtp_cm, server = _make_smtp_mock()
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 25
            mock_settings.SMTP_USER = None
            mock_settings.SMTP_PASSWORD = None
            mock_settings.SMTP_FROM = None
            with patch("smtplib.SMTP", return_value=smtp_cm):
                await NotificationService.send_email("to@example.com", "Subject", "Body")
        server.starttls.assert_not_called()

    async def test_login_called_when_credentials_provided(self) -> None:
        smtp_cm, server = _make_smtp_mock()
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = "myuser"
            mock_settings.SMTP_PASSWORD = "mypass"
            mock_settings.SMTP_FROM = "from@example.com"
            with patch("smtplib.SMTP", return_value=smtp_cm):
                await NotificationService.send_email("to@example.com", "Subject", "Body")
        server.login.assert_called_once_with("myuser", "mypass")

    async def test_login_not_called_without_credentials(self) -> None:
        smtp_cm, server = _make_smtp_mock()
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = None
            mock_settings.SMTP_PASSWORD = None
            mock_settings.SMTP_FROM = None
            with patch("smtplib.SMTP", return_value=smtp_cm):
                await NotificationService.send_email("to@example.com", "Subject", "Body")
        server.login.assert_not_called()


# ---------------------------------------------------------------------------
# send_email — SMTP failure path
# ---------------------------------------------------------------------------


class TestSendEmailSmtpFailure:
    async def test_returns_false_on_smtp_exception(self) -> None:
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = None
            mock_settings.SMTP_PASSWORD = None
            mock_settings.SMTP_FROM = None
            with patch("smtplib.SMTP", side_effect=OSError("Connection refused")):
                result = await NotificationService.send_email("to@example.com", "Subject", "Body")
        assert result is False

    async def test_returns_false_on_login_exception(self) -> None:
        smtp_cm, server = _make_smtp_mock()
        server.login.side_effect = Exception("Auth failed")
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.SMTP_HOST = "smtp.example.com"
            mock_settings.SMTP_PORT = 587
            mock_settings.SMTP_USER = "u"
            mock_settings.SMTP_PASSWORD = "p"
            mock_settings.SMTP_FROM = None
            with patch("smtplib.SMTP", return_value=smtp_cm):
                result = await NotificationService.send_email("to@example.com", "Subject", "Body")
        assert result is False


# ---------------------------------------------------------------------------
# notify_license_violation — with webhook configured
# ---------------------------------------------------------------------------


class TestNotifyLicenseViolationWithWebhook:
    async def test_webhook_called_when_configured(self) -> None:
        violations = [{"software_name": "App", "purchased_count": 5, "total_used": 8, "over_deployed": 3}]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/alert"
            with patch.object(
                NotificationService, "send_webhook", new=AsyncMock(return_value=True)
            ) as mock_webhook:
                await NotificationService.notify_license_violation(violations)
        mock_webhook.assert_called_once()
        call_args = mock_webhook.call_args
        assert call_args.args[0] == "https://hook.example.com/alert"
        assert call_args.args[1]["type"] == "license_violation"

    async def test_webhook_payload_contains_violations(self) -> None:
        violations = [{"software_name": "OfficeApp", "purchased_count": 10, "total_used": 12, "over_deployed": 2}]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/alert"
            with patch.object(
                NotificationService, "send_webhook", new=AsyncMock(return_value=True)
            ) as mock_webhook:
                await NotificationService.notify_license_violation(violations)
        payload = mock_webhook.call_args.args[1]
        assert payload["violations"] == violations

    async def test_both_email_and_webhook_called_when_both_configured(self) -> None:
        violations = [{"software_name": "App", "purchased_count": 5, "total_used": 6, "over_deployed": 1}]
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/alert"
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                with patch.object(NotificationService, "send_webhook", new=AsyncMock(return_value=True)) as mock_webhook:
                    await NotificationService.notify_license_violation(violations)
        mock_email.assert_called_once()
        mock_webhook.assert_called_once()


# ---------------------------------------------------------------------------
# notify_security_alert — with webhook configured
# ---------------------------------------------------------------------------


class TestNotifySecurityAlertWithWebhook:
    async def test_webhook_called_when_configured(self) -> None:
        alert = {"title": "Port Scan", "severity": "high", "description": "Detected", "device_id": "dev-001"}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/security"
            with patch.object(
                NotificationService, "send_webhook", new=AsyncMock(return_value=True)
            ) as mock_webhook:
                await NotificationService.notify_security_alert(alert)
        mock_webhook.assert_called_once()
        payload = mock_webhook.call_args.args[1]
        assert payload["type"] == "security_alert"
        assert payload["alert"] == alert

    async def test_both_email_and_webhook_called_for_security_alert(self) -> None:
        alert = {"title": "Malware", "severity": "critical", "description": "Found", "device_id": "dev-002"}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/security"
            with patch.object(NotificationService, "send_email", new=AsyncMock(return_value=True)) as mock_email:
                with patch.object(NotificationService, "send_webhook", new=AsyncMock(return_value=True)) as mock_webhook:
                    await NotificationService.notify_security_alert(alert)
        mock_email.assert_called_once()
        mock_webhook.assert_called_once()

    async def test_webhook_not_called_when_not_configured(self) -> None:
        alert = {"title": "Alert", "severity": "low", "description": ""}
        with patch("app.services.notification_service.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch.object(
                NotificationService, "send_webhook", new=AsyncMock(return_value=True)
            ) as mock_webhook:
                await NotificationService.notify_security_alert(alert)
        mock_webhook.assert_not_called()
