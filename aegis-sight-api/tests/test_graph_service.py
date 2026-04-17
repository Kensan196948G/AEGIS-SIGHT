"""Unit tests for GraphService — mocks msal and httpx, no DB required."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.graph_service import GRAPH_BASE_URL, GRAPH_BETA_URL, GraphService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service() -> GraphService:
    """Instantiate GraphService with mocked MSAL application."""
    with patch("app.services.graph_service.msal.ConfidentialClientApplication"):
        return GraphService()


def _mock_token_ok(svc: GraphService, token: str = "test-token") -> None:
    svc._app.acquire_token_for_client.return_value = {"access_token": token}


def _mock_token_fail(svc: GraphService, error: str = "invalid_client") -> None:
    svc._app.acquire_token_for_client.return_value = {
        "error": error,
        "error_description": f"{error} description",
    }


def _mock_httpx_get(response_json: dict, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.AsyncClient context manager that returns a fixed response."""
    mock_response = MagicMock()
    mock_response.json.return_value = response_json
    mock_response.raise_for_status = MagicMock()
    if status_code >= 400:
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            message=f"HTTP {status_code}",
            request=MagicMock(),
            response=MagicMock(status_code=status_code),
        )

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


# ---------------------------------------------------------------------------
# GraphService.__init__
# ---------------------------------------------------------------------------

class TestInit:
    def test_msal_app_created(self):
        with patch(
            "app.services.graph_service.msal.ConfidentialClientApplication"
        ) as mock_cls:
            GraphService()
            mock_cls.assert_called_once()

    def test_authority_contains_tenant(self):
        with patch(
            "app.services.graph_service.msal.ConfidentialClientApplication"
        ) as mock_cls:
            with patch("app.services.graph_service.settings") as mock_settings:
                mock_settings.AZURE_TENANT_ID = "my-tenant-id"
                mock_settings.AZURE_CLIENT_ID = "client-id"
                mock_settings.AZURE_CLIENT_SECRET = "secret"
                GraphService()
            _, kwargs = mock_cls.call_args
            assert "my-tenant-id" in kwargs.get(
                "authority", mock_cls.call_args[0][2] if len(mock_cls.call_args[0]) > 2 else ""
            ) or any("my-tenant-id" in str(a) for a in mock_cls.call_args[0])


# ---------------------------------------------------------------------------
# _get_access_token
# ---------------------------------------------------------------------------

class TestGetAccessToken:
    @pytest.mark.asyncio
    async def test_returns_token_on_success(self):
        svc = _make_service()
        _mock_token_ok(svc, "my-token-abc")
        token = await svc._get_access_token()
        assert token == "my-token-abc"

    @pytest.mark.asyncio
    async def test_raises_on_missing_access_token(self):
        svc = _make_service()
        _mock_token_fail(svc)
        with pytest.raises(RuntimeError, match="Graph token acquisition failed"):
            await svc._get_access_token()

    @pytest.mark.asyncio
    async def test_error_description_in_message(self):
        svc = _make_service()
        _mock_token_fail(svc, "tenant_not_found")
        with pytest.raises(RuntimeError, match="tenant_not_found description"):
            await svc._get_access_token()

    @pytest.mark.asyncio
    async def test_calls_correct_scope(self):
        svc = _make_service()
        _mock_token_ok(svc)
        await svc._get_access_token()
        svc._app.acquire_token_for_client.assert_called_once_with(
            scopes=["https://graph.microsoft.com/.default"]
        )


# ---------------------------------------------------------------------------
# _get_headers
# ---------------------------------------------------------------------------

class TestGetHeaders:
    @pytest.mark.asyncio
    async def test_authorization_bearer(self):
        svc = _make_service()
        _mock_token_ok(svc, "tok123")
        headers = await svc._get_headers()
        assert headers["Authorization"] == "Bearer tok123"

    @pytest.mark.asyncio
    async def test_content_type_json(self):
        svc = _make_service()
        _mock_token_ok(svc)
        headers = await svc._get_headers()
        assert headers["Content-Type"] == "application/json"


# ---------------------------------------------------------------------------
# _get
# ---------------------------------------------------------------------------

class TestGet:
    @pytest.mark.asyncio
    async def test_returns_response_json(self):
        svc = _make_service()
        _mock_token_ok(svc)
        payload = {"value": [{"id": "item1"}]}
        mock_client = _mock_httpx_get(payload)
        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            result = await svc._get("https://example.com/data")
        assert result == payload

    @pytest.mark.asyncio
    async def test_calls_raise_for_status(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_client = _mock_httpx_get({"value": []}, status_code=403)
        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await svc._get("https://example.com/data")

    @pytest.mark.asyncio
    async def test_uses_correct_url(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_client = _mock_httpx_get({})
        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            await svc._get("https://custom.url/path")
        mock_client.get.assert_called_once()
        call_url = mock_client.get.call_args[0][0]
        assert call_url == "https://custom.url/path"


# ---------------------------------------------------------------------------
# _get_all_pages
# ---------------------------------------------------------------------------

class TestGetAllPages:
    @pytest.mark.asyncio
    async def test_single_page(self):
        svc = _make_service()
        _mock_token_ok(svc)
        items = [{"id": "a"}, {"id": "b"}]
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {"value": items}
        mock_client.get.return_value = resp
        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            result = await svc._get_all_pages("https://example.com/items")
        assert result == items

    @pytest.mark.asyncio
    async def test_follows_next_link(self):
        svc = _make_service()
        _mock_token_ok(svc)

        page1 = {"value": [{"id": "p1"}], "@odata.nextLink": "https://example.com/items?page=2"}
        page2 = {"value": [{"id": "p2"}]}

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        resp1, resp2 = MagicMock(), MagicMock()
        resp1.raise_for_status = MagicMock()
        resp1.json.return_value = page1
        resp2.raise_for_status = MagicMock()
        resp2.json.return_value = page2
        mock_client.get.side_effect = [resp1, resp2]

        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            result = await svc._get_all_pages("https://example.com/items")

        assert len(result) == 2
        assert result[0]["id"] == "p1"
        assert result[1]["id"] == "p2"

    @pytest.mark.asyncio
    async def test_empty_value_list(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.json.return_value = {}
        mock_client.get.return_value = resp
        with patch("app.services.graph_service.httpx.AsyncClient", return_value=mock_client):
            result = await svc._get_all_pages("https://example.com/empty")
        assert result == []


# ---------------------------------------------------------------------------
# get_m365_licenses
# ---------------------------------------------------------------------------

class TestGetM365Licenses:
    @pytest.mark.asyncio
    async def test_returns_sku_list(self):
        svc = _make_service()
        _mock_token_ok(svc)
        skus = [{"skuId": "sku-001", "skuPartNumber": "ENTERPRISEPACK"}]
        with patch.object(svc, "_get", new=AsyncMock(return_value={"value": skus})):
            result = await svc.get_m365_licenses()
        assert result == skus

    @pytest.mark.asyncio
    async def test_calls_subscribed_skus_endpoint(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_get = AsyncMock(return_value={"value": []})
        with patch.object(svc, "_get", new=mock_get):
            await svc.get_m365_licenses()
        called_url = mock_get.call_args[0][0]
        assert called_url == f"{GRAPH_BASE_URL}/subscribedSkus"

    @pytest.mark.asyncio
    async def test_empty_response(self):
        svc = _make_service()
        _mock_token_ok(svc)
        with patch.object(svc, "_get", new=AsyncMock(return_value={})):
            result = await svc.get_m365_licenses()
        assert result == []


# ---------------------------------------------------------------------------
# get_m365_users
# ---------------------------------------------------------------------------

class TestGetM365Users:
    @pytest.mark.asyncio
    async def test_returns_user_list(self):
        svc = _make_service()
        _mock_token_ok(svc)
        users = [{"id": "u1", "displayName": "Alice"}]
        with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=users)):
            result = await svc.get_m365_users()
        assert result == users

    @pytest.mark.asyncio
    async def test_url_contains_select_fields(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_m365_users()
        called_url = mock_pages.call_args[0][0]
        assert "displayName" in called_url
        assert "assignedLicenses" in called_url

    @pytest.mark.asyncio
    async def test_uses_get_all_pages(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_m365_users()
        mock_pages.assert_called_once()


# ---------------------------------------------------------------------------
# get_intune_devices
# ---------------------------------------------------------------------------

class TestGetIntuneDevices:
    @pytest.mark.asyncio
    async def test_returns_device_list(self):
        svc = _make_service()
        _mock_token_ok(svc)
        devices = [{"id": "dev-01", "deviceName": "DESKTOP-001"}]
        with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=devices)):
            result = await svc.get_intune_devices()
        assert result == devices

    @pytest.mark.asyncio
    async def test_url_contains_managed_devices(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_intune_devices()
        called_url = mock_pages.call_args[0][0]
        assert "managedDevices" in called_url

    @pytest.mark.asyncio
    async def test_url_contains_compliance_state(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_intune_devices()
        called_url = mock_pages.call_args[0][0]
        assert "complianceState" in called_url


# ---------------------------------------------------------------------------
# get_defender_alerts
# ---------------------------------------------------------------------------

class TestGetDefenderAlerts:
    @pytest.mark.asyncio
    async def test_returns_alert_list(self):
        svc = _make_service()
        _mock_token_ok(svc)
        alerts = [{"id": "alert-001", "severity": "high"}]
        with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=alerts)):
            result = await svc.get_defender_alerts()
        assert result == alerts

    @pytest.mark.asyncio
    async def test_uses_beta_endpoint(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_defender_alerts()
        called_url = mock_pages.call_args[0][0]
        assert GRAPH_BETA_URL in called_url

    @pytest.mark.asyncio
    async def test_url_contains_alerts_v2(self):
        svc = _make_service()
        _mock_token_ok(svc)
        mock_pages = AsyncMock(return_value=[])
        with patch.object(svc, "_get_all_pages", new=mock_pages):
            await svc.get_defender_alerts()
        called_url = mock_pages.call_args[0][0]
        assert "alerts_v2" in called_url

    @pytest.mark.asyncio
    async def test_empty_alerts(self):
        svc = _make_service()
        _mock_token_ok(svc)
        with patch.object(svc, "_get_all_pages", new=AsyncMock(return_value=[])):
            result = await svc.get_defender_alerts()
        assert result == []
