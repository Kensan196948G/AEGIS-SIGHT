"""Tests for M365 Graph API endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_m365_licenses_unauthorized(client: AsyncClient):
    """Test that M365 license endpoint requires authentication."""
    response = await client.get("/api/v1/m365/licenses")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_m365_licenses_forbidden_for_non_admin(
    client: AsyncClient, readonly_headers: dict
):
    """Test that M365 license endpoint requires admin role."""
    response = await client.get("/api/v1/m365/licenses", headers=readonly_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_m365_licenses_success(client: AsyncClient, admin_headers: dict):
    """Test M365 license listing with mocked Graph API."""
    mock_licenses = [
        {
            "skuId": "sku-001",
            "skuPartNumber": "ENTERPRISEPACK",
            "consumedUnits": 50,
            "prepaidUnits": {"enabled": 100, "suspended": 0, "warning": 5},
            "capabilityStatus": "Enabled",
        },
    ]

    with patch(
        "app.api.v1.m365.GraphService.get_m365_licenses",
        new_callable=AsyncMock,
        return_value=mock_licenses,
    ):
        response = await client.get("/api/v1/m365/licenses", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["sku_part_number"] == "ENTERPRISEPACK"
        assert data["items"][0]["consumed_units"] == 50
        assert data["items"][0]["prepaid_enabled"] == 100


@pytest.mark.asyncio
async def test_m365_users_unauthorized(client: AsyncClient):
    """Test that M365 users endpoint requires authentication."""
    response = await client.get("/api/v1/m365/users")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_m365_users_success(client: AsyncClient, admin_headers: dict):
    """Test M365 user listing with mocked Graph API."""
    mock_users = [
        {
            "id": "user-001",
            "displayName": "Test User",
            "mail": "test@example.com",
            "userPrincipalName": "test@example.com",
            "accountEnabled": True,
            "assignedLicenses": [{"skuId": "sku-001"}],
            "createdDateTime": "2025-01-01T00:00:00Z",
        },
    ]

    with patch(
        "app.api.v1.m365.GraphService.get_m365_users",
        new_callable=AsyncMock,
        return_value=mock_users,
    ):
        response = await client.get("/api/v1/m365/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["display_name"] == "Test User"
        assert data["items"][0]["assigned_license_count"] == 1


@pytest.mark.asyncio
async def test_m365_sync_success(client: AsyncClient, admin_headers: dict):
    """Test M365 sync trigger with mocked Graph API."""
    with patch(
        "app.api.v1.m365.GraphService.get_m365_licenses",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.api.v1.m365.GraphService.get_m365_users",
        new_callable=AsyncMock,
        return_value=[{"id": "u1"}],
    ), patch(
        "app.api.v1.m365.GraphService.get_intune_devices",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.api.v1.m365.GraphService.get_defender_alerts",
        new_callable=AsyncMock,
        return_value=[],
    ):
        response = await client.post("/api/v1/m365/sync", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["details"]["licenses_fetched"] == 0
        assert data["details"]["users_fetched"] == 1


@pytest.mark.asyncio
async def test_m365_sync_partial_failure(client: AsyncClient, admin_headers: dict):
    """Test M365 sync with partial failures."""
    with patch(
        "app.api.v1.m365.GraphService.get_m365_licenses",
        new_callable=AsyncMock,
        side_effect=RuntimeError("Token failed"),
    ), patch(
        "app.api.v1.m365.GraphService.get_m365_users",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.api.v1.m365.GraphService.get_intune_devices",
        new_callable=AsyncMock,
        return_value=[],
    ), patch(
        "app.api.v1.m365.GraphService.get_defender_alerts",
        new_callable=AsyncMock,
        return_value=[],
    ):
        response = await client.post("/api/v1/m365/sync", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "partial"
        assert "errors" in data["details"]


@pytest.mark.asyncio
async def test_m365_sync_forbidden_for_operator(
    client: AsyncClient, operator_headers: dict
):
    """Test that M365 sync requires admin role."""
    response = await client.post("/api/v1/m365/sync", headers=operator_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_m365_licenses_graph_unavailable(
    client: AsyncClient, admin_headers: dict
):
    """Test M365 licenses returns 503 when Graph API is unavailable."""
    with patch(
        "app.api.v1.m365.GraphService.get_m365_licenses",
        new_callable=AsyncMock,
        side_effect=Exception("Connection refused"),
    ):
        response = await client.get("/api/v1/m365/licenses", headers=admin_headers)
        assert response.status_code == 503
