"""Unit tests for procurement notification integration (Issue #425)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

# ---------------------------------------------------------------------------
# _send_procurement_notifications
# ---------------------------------------------------------------------------


class TestSendProcurementNotifications:
    async def test_email_sent_when_configured(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {
            "total_pending": 3,
            "awaiting_approval_by_department": {"Engineering": 2, "HR": 1},
        }
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch(
                "app.services.notification_service.NotificationService.send_email",
                new=AsyncMock(return_value=True),
            ) as mock_email:
                await _send_procurement_notifications(data)
        mock_email.assert_awaited_once()

    async def test_email_subject_contains_count(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 7, "awaiting_approval_by_department": {}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch(
                "app.services.notification_service.NotificationService.send_email",
                new=AsyncMock(return_value=True),
            ) as mock_email:
                await _send_procurement_notifications(data)
        _, subject, _ = mock_email.call_args.args
        assert "7" in subject

    async def test_email_not_sent_when_not_configured(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 3, "awaiting_approval_by_department": {}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch(
                "app.services.notification_service.NotificationService.send_email",
                new=AsyncMock(return_value=True),
            ) as mock_email:
                await _send_procurement_notifications(data)
        mock_email.assert_not_awaited()

    async def test_webhook_sent_when_configured(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 2, "awaiting_approval_by_department": {"IT": 2}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/procurement"
            with patch(
                "app.services.notification_service.NotificationService.send_webhook",
                new=AsyncMock(return_value=True),
            ) as mock_webhook:
                await _send_procurement_notifications(data)
        mock_webhook.assert_awaited_once()

    async def test_webhook_payload_type(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 4, "awaiting_approval_by_department": {"Ops": 4}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/p"
            with patch(
                "app.services.notification_service.NotificationService.send_webhook",
                new=AsyncMock(return_value=True),
            ) as mock_webhook:
                await _send_procurement_notifications(data)
        _, payload = mock_webhook.call_args.args
        assert payload["type"] == "procurement_pending"

    async def test_webhook_payload_contains_total(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 5, "awaiting_approval_by_department": {}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/p"
            with patch(
                "app.services.notification_service.NotificationService.send_webhook",
                new=AsyncMock(return_value=True),
            ) as mock_webhook:
                await _send_procurement_notifications(data)
        _, payload = mock_webhook.call_args.args
        assert payload["total_pending"] == 5

    async def test_both_email_and_webhook_called(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 1, "awaiting_approval_by_department": {"Finance": 1}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = "admin@example.com"
            mock_settings.ALERT_WEBHOOK_URL = "https://hook.example.com/p"
            with patch(
                "app.services.notification_service.NotificationService.send_email",
                new=AsyncMock(return_value=True),
            ) as mock_email:
                with patch(
                    "app.services.notification_service.NotificationService.send_webhook",
                    new=AsyncMock(return_value=True),
                ) as mock_webhook:
                    await _send_procurement_notifications(data)
        mock_email.assert_awaited_once()
        mock_webhook.assert_awaited_once()

    async def test_webhook_not_sent_when_not_configured(self) -> None:
        from app.tasks.procurement_tasks import _send_procurement_notifications

        data = {"total_pending": 3, "awaiting_approval_by_department": {}}
        with patch("app.tasks.procurement_tasks.settings") as mock_settings:
            mock_settings.ADMIN_NOTIFICATION_EMAIL = None
            mock_settings.ALERT_WEBHOOK_URL = None
            with patch(
                "app.services.notification_service.NotificationService.send_webhook",
                new=AsyncMock(return_value=True),
            ) as mock_webhook:
                await _send_procurement_notifications(data)
        mock_webhook.assert_not_awaited()


# ---------------------------------------------------------------------------
# notify_pending_approvals Celery task — notification path
# ---------------------------------------------------------------------------


class TestNotifyPendingApprovalsTask:
    def test_returns_result_dict(self) -> None:
        from app.tasks.procurement_tasks import notify_pending_approvals

        pending_data = {
            "status_counts": {"submitted": 2},
            "awaiting_approval_by_department": {"Engineering": 2},
            "total_pending": 2,
        }
        with patch(
            "app.tasks.procurement_tasks._collect_pending_approvals",
            new=AsyncMock(return_value=pending_data),
        ):
            with patch(
                "app.tasks.procurement_tasks._send_procurement_notifications",
                new=AsyncMock(return_value=None),
            ):
                result = notify_pending_approvals()
        assert result["total_pending"] == 2

    def test_no_notifications_sent_when_zero_pending(self) -> None:
        from app.tasks.procurement_tasks import notify_pending_approvals

        pending_data = {
            "status_counts": {},
            "awaiting_approval_by_department": {},
            "total_pending": 0,
        }
        with patch(
            "app.tasks.procurement_tasks._collect_pending_approvals",
            new=AsyncMock(return_value=pending_data),
        ):
            with patch(
                "app.tasks.procurement_tasks._send_procurement_notifications",
                new=AsyncMock(return_value=None),
            ) as mock_notify:
                notify_pending_approvals()
        mock_notify.assert_not_awaited()

    def test_notifications_sent_when_pending_exists(self) -> None:
        from app.tasks.procurement_tasks import notify_pending_approvals

        pending_data = {
            "status_counts": {"submitted": 1},
            "awaiting_approval_by_department": {"IT": 1},
            "total_pending": 1,
        }
        with patch(
            "app.tasks.procurement_tasks._collect_pending_approvals",
            new=AsyncMock(return_value=pending_data),
        ):
            with patch(
                "app.tasks.procurement_tasks._send_procurement_notifications",
                new=AsyncMock(return_value=None),
            ) as mock_notify:
                notify_pending_approvals()
        mock_notify.assert_awaited_once()
