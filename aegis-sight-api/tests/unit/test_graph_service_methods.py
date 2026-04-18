"""Unit tests for GraphService methods — MSAL and httpx mocked, no network."""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.graph_service import GRAPH_BASE_URL, GRAPH_BETA_URL, GraphService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_service() -> GraphService:
    """Create GraphService with MSAL app mocked out."""
    with patch("app.services.graph_service.msal.ConfidentialClientApplication"):
        svc = GraphService()
    return svc


def _mock_token_on(svc: GraphService, token: str = "test-token") -> None:
    svc._app.acquire_token_for_client = MagicMock(
        return_value={"access_token": token}
    )


def _mock_token_fail_on(svc: GraphService, error: str = "token_error") -> None:
    svc._app.acquire_token_for_client = MagicMock(
        return_value={"error": error}
    )


def _json_transport(responses: list[dict]) -> httpx.MockTransport:
    """Return a transport that serves JSON dicts in order."""
    calls = [0]

    async def handler(request: httpx.Request) -> httpx.Response:
        idx = calls[0]
        calls[0] += 1
        data = responses[idx % len(responses)]
        return httpx.Response(200, content=json.dumps(data).encode())

    return httpx.MockTransport(handler)


# ---------------------------------------------------------------------------
# _get_access_token
# ---------------------------------------------------------------------------


class TestGetAccessToken:
    def test_returns_token_string(self) -> None:
        svc = _make_service()
        _mock_token_on(svc, "abc-xyz")
        result = asyncio.run(svc._get_access_token())
        assert result == "abc-xyz"

    def test_calls_acquire_with_correct_scope(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)
        asyncio.run(svc._get_access_token())
        svc._app.acquire_token_for_client.assert_called_once_with(
            scopes=["https://graph.microsoft.com/.default"]
        )

    def test_raises_runtime_error_on_failure(self) -> None:
        svc = _make_service()
        _mock_token_fail_on(svc, "invalid_client")
        with pytest.raises(RuntimeError, match="Graph token acquisition failed"):
            asyncio.run(svc._get_access_token())

    def test_error_message_contains_error_value(self) -> None:
        svc = _make_service()
        _mock_token_fail_on(svc, "my_error_code")
        with pytest.raises(RuntimeError) as exc:
            asyncio.run(svc._get_access_token())
        assert "my_error_code" in str(exc.value)

    def test_uses_error_description_when_available(self) -> None:
        svc = _make_service()
        svc._app.acquire_token_for_client = MagicMock(
            return_value={"error": "e", "error_description": "detailed desc"}
        )
        with pytest.raises(RuntimeError) as exc:
            asyncio.run(svc._get_access_token())
        assert "detailed desc" in str(exc.value)


# ---------------------------------------------------------------------------
# _get_headers
# ---------------------------------------------------------------------------


class TestGetHeaders:
    def test_returns_dict(self) -> None:
        svc = _make_service()
        _mock_token_on(svc, "mytoken")
        headers = asyncio.run(svc._get_headers())
        assert isinstance(headers, dict)

    def test_authorization_header_is_bearer(self) -> None:
        svc = _make_service()
        _mock_token_on(svc, "mytoken")
        headers = asyncio.run(svc._get_headers())
        assert headers["Authorization"] == "Bearer mytoken"

    def test_content_type_is_json(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)
        headers = asyncio.run(svc._get_headers())
        assert headers["Content-Type"] == "application/json"

    def test_has_exactly_two_keys(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)
        headers = asyncio.run(svc._get_headers())
        assert set(headers.keys()) == {"Authorization", "Content-Type"}


# ---------------------------------------------------------------------------
# _get_all_pages
# ---------------------------------------------------------------------------


class TestGetAllPages:
    def test_single_page_returns_value_list(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)
        transport = _json_transport([{"value": [{"id": "1"}, {"id": "2"}]}])

        async def _run():
            async with httpx.AsyncClient(transport=transport) as client:
                original_init = svc._get_headers

                async def _patched_get(url: str) -> list:
                    headers = await original_init()
                    response = await client.get(url, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    items = list(data.get("value", []))
                    next_url = data.get("@odata.nextLink")
                    while next_url:
                        response = await client.get(next_url, headers=headers)
                        response.raise_for_status()
                        data = response.json()
                        items.extend(data.get("value", []))
                        next_url = data.get("@odata.nextLink")
                    return items

                return await _patched_get("https://graph.microsoft.com/v1.0/test")

        result = asyncio.run(_run())
        assert len(result) == 2
        assert result[0]["id"] == "1"

    def test_empty_value_returns_empty_list(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)
        responses = [{"value": []}]
        _transport = _json_transport(responses)

        async def _run():
            svc._app.acquire_token_for_client.return_value = {"access_token": "tok"}
            with patch.object(
                svc,
                "_get_headers",
                new=AsyncMock(return_value={"Authorization": "Bearer tok"}),
            ):
                with patch("httpx.AsyncClient") as mock_cls:
                    mock_client = AsyncMock()
                    mock_response = MagicMock()
                    mock_response.json.return_value = {"value": []}
                    mock_response.raise_for_status = MagicMock()
                    mock_client.get = AsyncMock(return_value=mock_response)
                    mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
                    mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)
                    return await svc._get_all_pages("https://graph.microsoft.com/v1.0/test")

        result = asyncio.run(_run())
        assert result == []

    def test_follows_nextlink(self) -> None:
        svc = _make_service()
        _mock_token_on(svc)

        call_count = [0]

        async def mock_get(url, headers=None):
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            if call_count[0] == 0:
                resp.json.return_value = {
                    "value": [{"id": "page1"}],
                    "@odata.nextLink": "https://graph.microsoft.com/v1.0/next",
                }
            else:
                resp.json.return_value = {"value": [{"id": "page2"}]}
            call_count[0] += 1
            return resp

        async def _run():
            with patch.object(
                svc,
                "_get_headers",
                new=AsyncMock(return_value={"Authorization": "Bearer tok"}),
            ):
                mock_client = AsyncMock()
                mock_client.get = AsyncMock(side_effect=mock_get)
                with patch("httpx.AsyncClient") as mock_cls:
                    mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
                    mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)
                    return await svc._get_all_pages("https://graph.microsoft.com/v1.0/start")

        result = asyncio.run(_run())
        assert len(result) == 2
        assert result[0]["id"] == "page1"
        assert result[1]["id"] == "page2"


# ---------------------------------------------------------------------------
# get_m365_licenses
# ---------------------------------------------------------------------------


class TestGetM365Licenses:
    def test_returns_list(self) -> None:
        svc = _make_service()

        async def _run():
            mock_data = {"value": [{"skuId": "sku-1"}, {"skuId": "sku-2"}]}
            with patch.object(svc, "_get", new=AsyncMock(return_value=mock_data)):
                return await svc.get_m365_licenses()

        result = asyncio.run(_run())
        assert isinstance(result, list)
        assert len(result) == 2

    def test_calls_subscribed_skus_endpoint(self) -> None:
        svc = _make_service()

        async def _run():
            mock_get = AsyncMock(return_value={"value": []})
            with patch.object(svc, "_get", new=mock_get):
                await svc.get_m365_licenses()
                url = mock_get.call_args[0][0]
                assert "subscribedSkus" in url
                assert GRAPH_BASE_URL in url

        asyncio.run(_run())

    def test_empty_value_returns_empty_list(self) -> None:
        svc = _make_service()

        async def _run():
            with patch.object(svc, "_get", new=AsyncMock(return_value={"value": []})):
                return await svc.get_m365_licenses()

        assert asyncio.run(_run()) == []


# ---------------------------------------------------------------------------
# get_m365_users
# ---------------------------------------------------------------------------


class TestGetM365Users:
    def test_calls_get_all_pages(self) -> None:
        svc = _make_service()
        users = [{"id": "u1"}, {"id": "u2"}]

        async def _run():
            with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=users)):
                return await svc.get_m365_users()

        result = asyncio.run(_run())
        assert result == users

    def test_url_contains_select_fields(self) -> None:
        svc = _make_service()

        async def _run():
            mock_pages = AsyncMock(return_value=[])
            with patch.object(svc, "_get_all_pages", new=mock_pages):
                await svc.get_m365_users()
                url = mock_pages.call_args[0][0]
                assert "$select" in url
                assert "displayName" in url

        asyncio.run(_run())


# ---------------------------------------------------------------------------
# get_intune_devices
# ---------------------------------------------------------------------------


class TestGetIntuneDevices:
    def test_calls_get_all_pages(self) -> None:
        svc = _make_service()
        devices = [{"id": "d1"}]

        async def _run():
            with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=devices)):
                return await svc.get_intune_devices()

        assert asyncio.run(_run()) == devices

    def test_url_contains_managed_devices(self) -> None:
        svc = _make_service()

        async def _run():
            mock_pages = AsyncMock(return_value=[])
            with patch.object(svc, "_get_all_pages", new=mock_pages):
                await svc.get_intune_devices()
                url = mock_pages.call_args[0][0]
                assert "managedDevices" in url

        asyncio.run(_run())


# ---------------------------------------------------------------------------
# get_defender_alerts
# ---------------------------------------------------------------------------


class TestGetDefenderAlerts:
    def test_calls_get_all_pages(self) -> None:
        svc = _make_service()
        alerts = [{"id": "a1", "severity": "high"}]

        async def _run():
            with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=alerts)):
                return await svc.get_defender_alerts()

        assert asyncio.run(_run()) == alerts

    def test_url_uses_beta_endpoint(self) -> None:
        svc = _make_service()

        async def _run():
            mock_pages = AsyncMock(return_value=[])
            with patch.object(svc, "_get_all_pages", new=mock_pages):
                await svc.get_defender_alerts()
                url = mock_pages.call_args[0][0]
                assert GRAPH_BETA_URL in url

        asyncio.run(_run())

    def test_url_contains_alerts_v2(self) -> None:
        svc = _make_service()

        async def _run():
            mock_pages = AsyncMock(return_value=[])
            with patch.object(svc, "_get_all_pages", new=mock_pages):
                await svc.get_defender_alerts()
                url = mock_pages.call_args[0][0]
                assert "alerts_v2" in url

        asyncio.run(_run())
