"""
Webhook event dispatcher -- delivers events to registered webhook endpoints.

Supports:
  - Asynchronous HTTP POST delivery via httpx
  - Exponential backoff retry (3 attempts)
  - HMAC-SHA256 event signing
  - Configurable event types

Event types:
  - device.created
  - device.updated
  - alert.created
  - license.violation
  - procurement.approved
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class WebhookEventType(StrEnum):
    device_created = "device.created"
    device_updated = "device.updated"
    alert_created = "alert.created"
    license_violation = "license.violation"
    procurement_approved = "procurement.approved"


class WebhookDeliveryResult:
    """Result of a single webhook delivery attempt."""

    __slots__ = ("attempts", "error", "status_code", "success", "url")

    def __init__(
        self,
        url: str,
        success: bool,
        status_code: int | None = None,
        attempts: int = 0,
        error: str | None = None,
    ) -> None:
        self.url = url
        self.success = success
        self.status_code = status_code
        self.attempts = attempts
        self.error = error

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "success": self.success,
            "status_code": self.status_code,
            "attempts": self.attempts,
            "error": self.error,
        }


class WebhookDispatcher:
    """
    Dispatches webhook events to registered endpoints with retry and signing.

    Usage::

        dispatcher = WebhookDispatcher(secret="my-webhook-secret")
        dispatcher.register("https://example.com/hook", ["device.created", "alert.created"])
        results = await dispatcher.dispatch_event(
            WebhookEventType.device_created,
            {"device_id": "abc-123", "hostname": "PC-001"},
        )
    """

    MAX_RETRIES: int = 3
    BASE_DELAY: float = 1.0  # seconds
    TIMEOUT: float = 30.0  # seconds

    def __init__(self, secret: str = "") -> None:
        self._secret = secret
        # url -> set of event types
        self._registrations: dict[str, set[str]] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------
    def register(self, url: str, event_types: list[str] | None = None) -> None:
        """Register a webhook URL for specific event types (or all)."""
        if event_types:
            self._registrations.setdefault(url, set()).update(event_types)
        else:
            # Register for all event types
            all_types = {e.value for e in WebhookEventType}
            self._registrations.setdefault(url, set()).update(all_types)

    def unregister(self, url: str) -> None:
        """Remove a webhook registration."""
        self._registrations.pop(url, None)

    def list_registrations(self) -> dict[str, list[str]]:
        """Return current registrations as a serialisable dict."""
        return {url: sorted(types) for url, types in self._registrations.items()}

    # ------------------------------------------------------------------
    # Signing
    # ------------------------------------------------------------------
    def _sign_payload(self, payload_bytes: bytes) -> str:
        """Generate HMAC-SHA256 signature for the payload."""
        return hmac.new(
            self._secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

    # ------------------------------------------------------------------
    # Dispatch
    # ------------------------------------------------------------------
    async def dispatch_event(
        self,
        event_type: WebhookEventType | str,
        payload: dict[str, Any],
    ) -> list[WebhookDeliveryResult]:
        """
        Dispatch an event to all registered webhooks that subscribe to
        the given event type.

        Returns a list of delivery results.
        """
        event_type_str = (
            event_type.value if isinstance(event_type, WebhookEventType) else event_type
        )

        # Build the envelope
        envelope: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "event_type": event_type_str,
            "timestamp": datetime.now(UTC).isoformat(),
            "payload": payload,
        }
        envelope_bytes = json.dumps(envelope, default=str).encode("utf-8")
        signature = self._sign_payload(envelope_bytes)

        # Determine target URLs
        target_urls = [
            url
            for url, types in self._registrations.items()
            if event_type_str in types
        ]

        if not target_urls:
            logger.debug(
                "No webhooks registered for event type '%s'", event_type_str
            )
            return []

        results: list[WebhookDeliveryResult] = []
        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            for url in target_urls:
                result = await self._deliver(client, url, envelope_bytes, signature)
                results.append(result)

        return results

    async def _deliver(
        self,
        client: httpx.AsyncClient,
        url: str,
        payload_bytes: bytes,
        signature: str,
    ) -> WebhookDeliveryResult:
        """Deliver a payload to a single URL with exponential backoff retry."""
        import asyncio

        headers = {
            "Content-Type": "application/json",
            "X-AEGIS-Signature": f"sha256={signature}",
            "X-AEGIS-Event": "webhook",
            "User-Agent": "AEGIS-SIGHT-Webhook/1.0",
        }

        last_error: str | None = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                response = await client.post(
                    url, content=payload_bytes, headers=headers
                )
                if response.is_success:
                    logger.info(
                        "Webhook delivered to %s (status %d, attempt %d)",
                        url,
                        response.status_code,
                        attempt,
                    )
                    return WebhookDeliveryResult(
                        url=url,
                        success=True,
                        status_code=response.status_code,
                        attempts=attempt,
                    )
                else:
                    last_error = f"HTTP {response.status_code}"
                    logger.warning(
                        "Webhook to %s returned %d (attempt %d/%d)",
                        url,
                        response.status_code,
                        attempt,
                        self.MAX_RETRIES,
                    )
            except Exception as exc:
                last_error = str(exc)
                logger.warning(
                    "Webhook to %s failed (attempt %d/%d): %s",
                    url,
                    attempt,
                    self.MAX_RETRIES,
                    exc,
                )

            # Exponential backoff before next retry
            if attempt < self.MAX_RETRIES:
                delay = self.BASE_DELAY * (2 ** (attempt - 1))
                await asyncio.sleep(delay)

        logger.error(
            "Webhook delivery to %s failed after %d attempts: %s",
            url,
            self.MAX_RETRIES,
            last_error,
        )
        return WebhookDeliveryResult(
            url=url,
            success=False,
            attempts=self.MAX_RETRIES,
            error=last_error,
        )
