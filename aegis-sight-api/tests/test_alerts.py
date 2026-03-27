import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertCategory, AlertSeverity
from app.models.user import User


async def _create_alert(
    db: AsyncSession,
    severity: AlertSeverity = AlertSeverity.warning,
    category: AlertCategory = AlertCategory.security,
    title: str = "Test Alert",
    message: str = "This is a test alert",
) -> Alert:
    """Helper to insert a test alert."""
    alert = Alert(
        severity=severity,
        category=category,
        title=title,
        message=message,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


@pytest.mark.asyncio
async def test_list_alerts_unauthorized(client: AsyncClient):
    """Test that listing alerts requires authentication."""
    response = await client.get("/api/v1/alerts")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_alerts(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test listing alerts with authentication."""
    await _create_alert(db_session)
    response = await client.get("/api/v1/alerts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_alert(client: AsyncClient, auth_headers: dict):
    """Test creating a new alert."""
    payload = {
        "severity": "critical",
        "category": "security",
        "title": "Unauthorized access detected",
        "message": "Multiple failed login attempts from unknown IP.",
    }
    response = await client.post("/api/v1/alerts", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["severity"] == "critical"
    assert data["category"] == "security"
    assert data["title"] == "Unauthorized access detected"
    assert data["is_acknowledged"] is False
    assert data["resolved_at"] is None


@pytest.mark.asyncio
async def test_get_alert(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test getting a specific alert."""
    alert = await _create_alert(db_session)
    response = await client.get(f"/api/v1/alerts/{alert.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(alert.id)
    assert data["title"] == "Test Alert"


@pytest.mark.asyncio
async def test_get_alert_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent alert returns 404."""
    response = await client.get(
        "/api/v1/alerts/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_acknowledge_alert(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test acknowledging an alert."""
    alert = await _create_alert(db_session)
    response = await client.patch(
        f"/api/v1/alerts/{alert.id}/acknowledge", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_acknowledged"] is True
    assert data["acknowledged_by"] is not None
    assert data["acknowledged_at"] is not None


@pytest.mark.asyncio
async def test_acknowledge_already_acknowledged(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that acknowledging an already-acknowledged alert returns 400."""
    alert = await _create_alert(db_session)
    # First acknowledge
    await client.patch(f"/api/v1/alerts/{alert.id}/acknowledge", headers=auth_headers)
    # Second acknowledge should fail
    response = await client.patch(
        f"/api/v1/alerts/{alert.id}/acknowledge", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_resolve_alert(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test resolving an alert."""
    alert = await _create_alert(db_session)
    response = await client.patch(
        f"/api/v1/alerts/{alert.id}/resolve", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["resolved_at"] is not None
    # Should also auto-acknowledge
    assert data["is_acknowledged"] is True


@pytest.mark.asyncio
async def test_resolve_already_resolved(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that resolving an already-resolved alert returns 400."""
    alert = await _create_alert(db_session)
    await client.patch(f"/api/v1/alerts/{alert.id}/resolve", headers=auth_headers)
    response = await client.patch(
        f"/api/v1/alerts/{alert.id}/resolve", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_alert_stats(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test alert statistics endpoint."""
    await _create_alert(db_session, severity=AlertSeverity.critical)
    await _create_alert(db_session, severity=AlertSeverity.warning)
    await _create_alert(db_session, severity=AlertSeverity.info)

    response = await client.get("/api/v1/alerts/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "critical" in data
    assert "warning" in data
    assert "info" in data
    assert "unacknowledged" in data
    assert "unresolved" in data
    assert data["total"] >= 3


@pytest.mark.asyncio
async def test_list_alerts_filter_severity(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering alerts by severity."""
    await _create_alert(db_session, severity=AlertSeverity.critical, title="Critical One")
    await _create_alert(db_session, severity=AlertSeverity.info, title="Info One")

    response = await client.get(
        "/api/v1/alerts?severity=critical", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["severity"] == "critical"


@pytest.mark.asyncio
async def test_list_alerts_filter_category(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering alerts by category."""
    await _create_alert(db_session, category=AlertCategory.network, title="Net Alert")

    response = await client.get(
        "/api/v1/alerts?category=network", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["category"] == "network"
