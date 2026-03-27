"""
Notification service -- email, webhook, and domain-specific alert helpers.

SMTP and webhook settings are read from environment variables via Settings.
"""

from __future__ import annotations

import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Stateless notification dispatcher."""

    # ------------------------------------------------------------------
    # Email
    # ------------------------------------------------------------------
    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> bool:
        """
        Send an email via SMTP.

        Returns True on success, False on failure (failures are logged but
        never propagated -- notifications must not break business flows).
        """
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        smtp_from = getattr(settings, "SMTP_FROM", smtp_user)

        if not smtp_host:
            logger.warning("SMTP_HOST is not configured -- skipping email to %s", to)
            return False

        try:
            msg = MIMEMultipart()
            msg["From"] = smtp_from or ""
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.ehlo()
                if smtp_port != 25:
                    server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from or "", [to], msg.as_string())

            logger.info("Email sent to %s: %s", to, subject)
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to)
            return False

    # ------------------------------------------------------------------
    # Webhook
    # ------------------------------------------------------------------
    @staticmethod
    async def send_webhook(url: str, payload: dict) -> bool:
        """
        POST a JSON payload to an external webhook URL.

        Returns True on success (2xx), False otherwise.
        """
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
            logger.info("Webhook delivered to %s (status %d)", url, response.status_code)
            return True
        except Exception:
            logger.exception("Failed to deliver webhook to %s", url)
            return False

    # ------------------------------------------------------------------
    # Domain-specific helpers
    # ------------------------------------------------------------------
    @staticmethod
    async def notify_license_violation(violations: list[dict]) -> None:
        """
        Send alerts for license compliance violations.

        Each violation dict should contain at least:
          - software_name: str
          - purchased_count: int
          - total_used: int
          - over_deployed: int
        """
        if not violations:
            return

        subject = f"[AEGIS-SIGHT] License violation detected ({len(violations)} items)"
        lines = ["The following software licenses exceed purchased counts:\n"]
        for v in violations:
            lines.append(
                f"  - {v.get('software_name', 'N/A')}: "
                f"purchased={v.get('purchased_count', '?')}, "
                f"used={v.get('total_used', '?')}, "
                f"over={v.get('over_deployed', '?')}"
            )
        body = "\n".join(lines)

        admin_email = getattr(settings, "ADMIN_NOTIFICATION_EMAIL", None)
        if admin_email:
            await NotificationService.send_email(admin_email, subject, body)

        webhook_url = getattr(settings, "ALERT_WEBHOOK_URL", None)
        if webhook_url:
            await NotificationService.send_webhook(
                webhook_url,
                {"type": "license_violation", "violations": violations},
            )

    @staticmethod
    async def notify_security_alert(alert: dict) -> None:
        """
        Send a security alert notification.

        The alert dict should contain:
          - title: str
          - severity: str (critical / high / medium / low)
          - description: str
          - device_id: str (optional)
        """
        subject = (
            f"[AEGIS-SIGHT] Security Alert: "
            f"{alert.get('severity', 'unknown').upper()} -- {alert.get('title', 'N/A')}"
        )
        body = (
            f"Severity: {alert.get('severity', 'unknown')}\n"
            f"Title: {alert.get('title', 'N/A')}\n"
            f"Description: {alert.get('description', '')}\n"
            f"Device: {alert.get('device_id', 'N/A')}\n"
        )

        admin_email = getattr(settings, "ADMIN_NOTIFICATION_EMAIL", None)
        if admin_email:
            await NotificationService.send_email(admin_email, subject, body)

        webhook_url = getattr(settings, "ALERT_WEBHOOK_URL", None)
        if webhook_url:
            await NotificationService.send_webhook(
                webhook_url,
                {"type": "security_alert", "alert": alert},
            )
