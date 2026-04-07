import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertCategory, AlertSeverity


async def _create_alert(
    db: AsyncSession,
    title: str = "Test Alert",
    message: str = "Test alert message",
    severity: AlertSeverity = AlertSeverity.warning,
    category: AlertCategory = AlertCategory.security,
) -> Alert:
    """Helper to insert a test alert."""
    alert = Alert(
        title=title,
        message=message,
        severity=severity,
        category=category,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


# ---------------------------------------------------------------------------
# Search API tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_search_unauthorized(client: AsyncClient):
    """Test that search requires authentication."""
    response = await client.get("/api/v1/search?q=test")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_search_missing_query(client: AsyncClient, auth_headers: dict):
    """Test that search requires a query parameter."""
    response = await client.get("/api/v1/search", headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_devices(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test searching for devices by hostname."""
    hostname = sample_device.hostname
    response = await client.get(
        f"/api/v1/search?q={hostname}&type=device", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == hostname
    assert data["total"] >= 1
    assert len(data["groups"]) >= 1
    assert data["groups"][0]["type"] == "device"


@pytest.mark.asyncio
async def test_search_licenses(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_license
):
    """Test searching for licenses by software name."""
    name = sample_license.software_name
    response = await client.get(
        f"/api/v1/search?q={name}&type=license", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    device_group = [g for g in data["groups"] if g["type"] == "license"]
    assert len(device_group) >= 1


@pytest.mark.asyncio
async def test_search_procurements(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_procurement
):
    """Test searching for procurements by request number."""
    req_num = sample_procurement.request_number
    response = await client.get(
        f"/api/v1/search?q={req_num}&type=procurement", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_alerts(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test searching for alerts by title."""
    unique_title = f"SearchableAlert-{uuid.uuid4().hex[:8]}"
    await _create_alert(db_session, title=unique_title, message="Some alert body")
    response = await client.get(
        f"/api/v1/search?q={unique_title}&type=alert", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["groups"][0]["type"] == "alert"
    assert data["groups"][0]["items"][0]["title"] == unique_title


@pytest.mark.asyncio
async def test_search_all_types(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, sample_device
):
    """Test unified search across all types."""
    hostname = sample_device.hostname
    response = await client.get(
        f"/api/v1/search?q={hostname}&type=all", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "groups" in data
    assert "total" in data
    assert isinstance(data["groups"], list)


@pytest.mark.asyncio
async def test_search_invalid_type(client: AsyncClient, auth_headers: dict):
    """Test that an invalid type parameter returns 400."""
    response = await client.get(
        "/api/v1/search?q=test&type=invalid", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient, auth_headers: dict):
    """Test search with a query that matches nothing."""
    response = await client.get(
        f"/api/v1/search?q=zzz_nonexistent_{uuid.uuid4().hex}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["groups"]) == 0


@pytest.mark.asyncio
async def test_search_pagination(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test search pagination parameters."""
    response = await client.get(
        "/api/v1/search?q=test&offset=0&limit=5", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["offset"] == 0
    assert data["limit"] == 5
