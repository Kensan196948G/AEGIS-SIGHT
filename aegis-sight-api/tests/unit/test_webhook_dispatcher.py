"""Unit tests for WebhookDispatcher — register/sign/to_dict pure logic, no I/O."""

import hashlib
import hmac

from app.services.webhook_dispatcher import (
    WebhookDeliveryResult,
    WebhookDispatcher,
    WebhookEventType,
)

ALL_EVENT_TYPES = {e.value for e in WebhookEventType}


# ---------------------------------------------------------------------------
# WebhookEventType
# ---------------------------------------------------------------------------


class TestWebhookEventType:
    def test_device_created_value(self) -> None:
        assert WebhookEventType.device_created == "device.created"

    def test_device_updated_value(self) -> None:
        assert WebhookEventType.device_updated == "device.updated"

    def test_alert_created_value(self) -> None:
        assert WebhookEventType.alert_created == "alert.created"

    def test_license_violation_value(self) -> None:
        assert WebhookEventType.license_violation == "license.violation"

    def test_procurement_approved_value(self) -> None:
        assert WebhookEventType.procurement_approved == "procurement.approved"

    def test_five_event_types(self) -> None:
        assert len(WebhookEventType) == 5


# ---------------------------------------------------------------------------
# WebhookDeliveryResult.to_dict
# ---------------------------------------------------------------------------


class TestDeliveryResultToDict:
    def test_success_result(self) -> None:
        r = WebhookDeliveryResult("https://example.com/hook", True, 200, 1)
        d = r.to_dict()
        assert d["url"] == "https://example.com/hook"
        assert d["success"] is True
        assert d["status_code"] == 200
        assert d["attempts"] == 1
        assert d["error"] is None

    def test_failure_result(self) -> None:
        r = WebhookDeliveryResult("https://example.com/hook", False, 500, 3, "timeout")
        d = r.to_dict()
        assert d["success"] is False
        assert d["status_code"] == 500
        assert d["attempts"] == 3
        assert d["error"] == "timeout"

    def test_keys_present(self) -> None:
        r = WebhookDeliveryResult("url", True)
        assert set(r.to_dict().keys()) == {"url", "success", "status_code", "attempts", "error"}

    def test_defaults(self) -> None:
        r = WebhookDeliveryResult("url", True)
        assert r.status_code is None
        assert r.attempts == 0
        assert r.error is None


# ---------------------------------------------------------------------------
# WebhookDispatcher.register
# ---------------------------------------------------------------------------


class TestRegister:
    def test_register_specific_event(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com/hook", ["device.created"])
        regs = d.list_registrations()
        assert "https://a.com/hook" in regs
        assert "device.created" in regs["https://a.com/hook"]

    def test_register_multiple_events(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created", "alert.created"])
        regs = d.list_registrations()
        assert set(regs["https://a.com"]) == {"device.created", "alert.created"}

    def test_register_all_events_when_none(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com")
        regs = d.list_registrations()
        assert set(regs["https://a.com"]) == ALL_EVENT_TYPES

    def test_register_idempotent(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        d.register("https://a.com", ["device.created"])
        assert d.list_registrations()["https://a.com"].count("device.created") == 1

    def test_register_accumulates_events(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        d.register("https://a.com", ["alert.created"])
        regs = d.list_registrations()
        assert "device.created" in regs["https://a.com"]
        assert "alert.created" in regs["https://a.com"]

    def test_register_multiple_urls(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        d.register("https://b.com", ["alert.created"])
        assert len(d.list_registrations()) == 2


# ---------------------------------------------------------------------------
# WebhookDispatcher.unregister
# ---------------------------------------------------------------------------


class TestUnregister:
    def test_unregister_removes_url(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        d.unregister("https://a.com")
        assert "https://a.com" not in d.list_registrations()

    def test_unregister_nonexistent_noop(self) -> None:
        d = WebhookDispatcher()
        d.unregister("https://no-such-url.com")  # must not raise

    def test_unregister_only_target(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        d.register("https://b.com", ["alert.created"])
        d.unregister("https://a.com")
        assert "https://b.com" in d.list_registrations()
        assert "https://a.com" not in d.list_registrations()


# ---------------------------------------------------------------------------
# WebhookDispatcher.list_registrations
# ---------------------------------------------------------------------------


class TestListRegistrations:
    def test_returns_empty_when_no_registrations(self) -> None:
        assert WebhookDispatcher().list_registrations() == {}

    def test_event_types_are_sorted(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.updated", "alert.created", "device.created"])
        types = d.list_registrations()["https://a.com"]
        assert types == sorted(types)

    def test_returns_serialisable_dict(self) -> None:
        d = WebhookDispatcher()
        d.register("https://a.com", ["device.created"])
        regs = d.list_registrations()
        assert isinstance(regs["https://a.com"], list)


# ---------------------------------------------------------------------------
# WebhookDispatcher._sign_payload
# ---------------------------------------------------------------------------


class TestSignPayload:
    def test_returns_hex_digest(self) -> None:
        d = WebhookDispatcher(secret="s3cr3t")
        sig = d._sign_payload(b"payload")
        assert all(c in "0123456789abcdef" for c in sig)
        assert len(sig) == 64

    def test_deterministic(self) -> None:
        d = WebhookDispatcher(secret="key")
        assert d._sign_payload(b"data") == d._sign_payload(b"data")

    def test_different_payloads_different_sigs(self) -> None:
        d = WebhookDispatcher(secret="key")
        assert d._sign_payload(b"a") != d._sign_payload(b"b")

    def test_different_secrets_different_sigs(self) -> None:
        d1 = WebhookDispatcher(secret="key1")
        d2 = WebhookDispatcher(secret="key2")
        assert d1._sign_payload(b"data") != d2._sign_payload(b"data")

    def test_matches_reference_hmac(self) -> None:
        secret = "test-secret"
        payload = b'{"event":"device.created"}'
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        d = WebhookDispatcher(secret=secret)
        assert d._sign_payload(payload) == expected

    def test_empty_secret_still_signs(self) -> None:
        d = WebhookDispatcher(secret="")
        sig = d._sign_payload(b"data")
        assert len(sig) == 64

    def test_empty_payload(self) -> None:
        d = WebhookDispatcher(secret="key")
        sig = d._sign_payload(b"")
        assert len(sig) == 64
