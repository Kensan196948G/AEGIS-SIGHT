"""Tests for the WebhookDispatcher service."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.webhook_dispatcher import (
    WebhookDeliveryResult,
    WebhookDispatcher,
    WebhookEventType,
)

# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class TestRegistration:
    def test_register_specific_events(self):
        dispatcher = WebhookDispatcher(secret="test-secret")
        dispatcher.register(
            "https://example.com/hook",
            ["device.created", "alert.created"],
        )
        regs = dispatcher.list_registrations()
        assert "https://example.com/hook" in regs
        assert "device.created" in regs["https://example.com/hook"]
        assert "alert.created" in regs["https://example.com/hook"]

    def test_register_all_events(self):
        dispatcher = WebhookDispatcher(secret="test-secret")
        dispatcher.register("https://example.com/all")
        regs = dispatcher.list_registrations()
        assert len(regs["https://example.com/all"]) == len(WebhookEventType)

    def test_unregister(self):
        dispatcher = WebhookDispatcher(secret="test-secret")
        dispatcher.register("https://example.com/hook", ["device.created"])
        dispatcher.unregister("https://example.com/hook")
        assert "https://example.com/hook" not in dispatcher.list_registrations()

    def test_unregister_nonexistent(self):
        dispatcher = WebhookDispatcher(secret="test-secret")
        dispatcher.unregister("https://nonexistent.com/hook")  # should not raise


# ---------------------------------------------------------------------------
# Signing
# ---------------------------------------------------------------------------

class TestSigning:
    def test_sign_payload_deterministic(self):
        dispatcher = WebhookDispatcher(secret="my-secret")
        payload = b'{"test": true}'
        sig1 = dispatcher._sign_payload(payload)
        sig2 = dispatcher._sign_payload(payload)
        assert sig1 == sig2
        assert len(sig1) == 64  # SHA-256 hex digest

    def test_different_secrets_produce_different_signatures(self):
        d1 = WebhookDispatcher(secret="secret-a")
        d2 = WebhookDispatcher(secret="secret-b")
        payload = b'{"test": true}'
        assert d1._sign_payload(payload) != d2._sign_payload(payload)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

class TestDispatch:
    @pytest.mark.asyncio
    async def test_dispatch_no_registrations(self):
        dispatcher = WebhookDispatcher(secret="test")
        results = await dispatcher.dispatch_event(
            WebhookEventType.device_created, {"hostname": "PC-001"}
        )
        assert results == []

    @pytest.mark.asyncio
    async def test_dispatch_event_not_subscribed(self):
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.register("https://example.com/hook", ["alert.created"])
        results = await dispatcher.dispatch_event(
            WebhookEventType.device_created, {"hostname": "PC-001"}
        )
        assert results == []

    @pytest.mark.asyncio
    async def test_dispatch_successful_delivery(self):
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.register("https://example.com/hook", ["device.created"])

        mock_response = AsyncMock()
        mock_response.is_success = True
        mock_response.status_code = 200

        with patch("httpx.AsyncClient.post", return_value=mock_response):
            results = await dispatcher.dispatch_event(
                WebhookEventType.device_created, {"hostname": "PC-001"}
            )

        assert len(results) == 1
        assert results[0].success is True
        assert results[0].status_code == 200
        assert results[0].attempts == 1

    @pytest.mark.asyncio
    async def test_dispatch_retry_on_failure(self):
        """Verify exponential backoff retry on transient failures."""
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.BASE_DELAY = 0.01  # speed up test
        dispatcher.register("https://example.com/hook", ["device.created"])

        call_count = 0

        async def mock_post(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Connection refused")
            resp = AsyncMock()
            resp.is_success = True
            resp.status_code = 200
            return resp

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            results = await dispatcher.dispatch_event(
                WebhookEventType.device_created, {"hostname": "PC-001"}
            )

        assert len(results) == 1
        assert results[0].success is True
        assert results[0].attempts == 3

    @pytest.mark.asyncio
    async def test_dispatch_all_retries_fail(self):
        """After MAX_RETRIES failures, result reports failure."""
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.BASE_DELAY = 0.01
        dispatcher.register("https://example.com/hook", ["alert.created"])

        async def mock_post(*args, **kwargs):
            raise ConnectionError("Connection refused")

        with patch("httpx.AsyncClient.post", side_effect=mock_post):
            results = await dispatcher.dispatch_event(
                WebhookEventType.alert_created, {"alert_id": "abc"}
            )

        assert len(results) == 1
        assert results[0].success is False
        assert results[0].attempts == 3
        assert results[0].error is not None

    @pytest.mark.asyncio
    async def test_dispatch_multiple_urls(self):
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.register("https://a.com/hook", ["device.created"])
        dispatcher.register("https://b.com/hook", ["device.created"])

        mock_response = AsyncMock()
        mock_response.is_success = True
        mock_response.status_code = 200

        with patch("httpx.AsyncClient.post", return_value=mock_response):
            results = await dispatcher.dispatch_event(
                WebhookEventType.device_created, {"hostname": "PC-001"}
            )

        assert len(results) == 2
        assert all(r.success for r in results)

    @pytest.mark.asyncio
    async def test_dispatch_with_string_event_type(self):
        """dispatch_event accepts raw string event types."""
        dispatcher = WebhookDispatcher(secret="test")
        dispatcher.register("https://example.com/hook", ["device.updated"])

        mock_response = AsyncMock()
        mock_response.is_success = True
        mock_response.status_code = 200

        with patch("httpx.AsyncClient.post", return_value=mock_response):
            results = await dispatcher.dispatch_event(
                "device.updated", {"device_id": "123"}
            )

        assert len(results) == 1
        assert results[0].success is True


# ---------------------------------------------------------------------------
# DeliveryResult
# ---------------------------------------------------------------------------

class TestDeliveryResult:
    def test_to_dict(self):
        r = WebhookDeliveryResult(
            url="https://example.com/hook",
            success=True,
            status_code=200,
            attempts=1,
        )
        d = r.to_dict()
        assert d["url"] == "https://example.com/hook"
        assert d["success"] is True
        assert d["status_code"] == 200
        assert d["attempts"] == 1
        assert d["error"] is None
