import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import (
    Incident,
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    ThreatIndicator,
    IndicatorType,
    ThreatLevel,
)
from app.models.user import User


async def _create_incident(
    db: AsyncSession,
    reported_by: uuid.UUID,
    severity: IncidentSeverity = IncidentSeverity.P2_high,
    category: IncidentCategory = IncidentCategory.unauthorized_access,
    title: str = "Test Incident",
    description: str = "This is a test incident",
) -> Incident:
    """Helper to insert a test incident."""
    incident = Incident(
        title=title,
        description=description,
        severity=severity,
        category=category,
        status=IncidentStatus.detected,
        reported_by=reported_by,
        timeline=[{"timestamp": "2026-03-27T00:00:00Z", "event": "Created"}],
    )
    db.add(incident)
    await db.flush()
    await db.refresh(incident)
    return incident


async def _create_threat(
    db: AsyncSession,
    indicator_type: IndicatorType = IndicatorType.ip_address,
    value: str = "192.168.1.100",
    threat_level: ThreatLevel = ThreatLevel.high,
) -> ThreatIndicator:
    """Helper to insert a test threat indicator."""
    indicator = ThreatIndicator(
        indicator_type=indicator_type,
        value=value,
        threat_level=threat_level,
        source="test",
        description="Test threat indicator",
    )
    db.add(indicator)
    await db.flush()
    await db.refresh(indicator)
    return indicator


# ---------------------------------------------------------------------------
# Incident endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_incidents_unauthorized(client: AsyncClient):
    """Test that listing incidents requires authentication."""
    response = await client.get("/api/v1/incidents")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_incidents(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test listing incidents with authentication."""
    await _create_incident(db_session, reported_by=test_user.id)
    response = await client.get("/api/v1/incidents", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_incidents_filter_severity(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test listing incidents filtered by severity."""
    await _create_incident(
        db_session, reported_by=test_user.id, severity=IncidentSeverity.P1_critical
    )
    response = await client.get(
        "/api/v1/incidents?severity=P1_critical", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["severity"] == "P1_critical"


@pytest.mark.asyncio
async def test_create_incident(client: AsyncClient, auth_headers: dict):
    """Test creating a new incident."""
    payload = {
        "title": "Unauthorized access detected",
        "description": "Multiple failed login attempts from unknown IP.",
        "severity": "P1_critical",
        "category": "unauthorized_access",
    }
    response = await client.post("/api/v1/incidents", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Unauthorized access detected"
    assert data["severity"] == "P1_critical"
    assert data["status"] == "detected"
    assert data["timeline"] is not None
    assert len(data["timeline"]) == 1


@pytest.mark.asyncio
async def test_get_incident(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test getting a specific incident."""
    incident = await _create_incident(db_session, reported_by=test_user.id)
    response = await client.get(
        f"/api/v1/incidents/{incident.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(incident.id)
    assert data["title"] == "Test Incident"


@pytest.mark.asyncio
async def test_get_incident_not_found(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent incident."""
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/incidents/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_incident(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test updating an incident."""
    incident = await _create_incident(db_session, reported_by=test_user.id)
    payload = {
        "status": "investigating",
        "description": "Updated description",
    }
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "investigating"
    assert data["description"] == "Updated description"
    # Timeline should have a new entry for status change
    assert len(data["timeline"]) >= 2


@pytest.mark.asyncio
async def test_assign_incident(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test assigning an incident."""
    incident = await _create_incident(db_session, reported_by=test_user.id)
    payload = {"assigned_to": str(test_user.id)}
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/assign", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["assigned_to"] == str(test_user.id)


@pytest.mark.asyncio
async def test_resolve_incident(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test resolving an incident."""
    incident = await _create_incident(db_session, reported_by=test_user.id)
    payload = {
        "root_cause": "Brute force attack from external IP",
        "resolution": "Blocked IP and enforced MFA",
        "lessons_learned": "Need to implement rate limiting",
    }
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/resolve", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resolved"
    assert data["root_cause"] == "Brute force attack from external IP"
    assert data["resolution"] == "Blocked IP and enforced MFA"
    assert data["resolved_at"] is not None


@pytest.mark.asyncio
async def test_resolve_already_resolved(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test that resolving an already-resolved incident returns 400."""
    incident = await _create_incident(db_session, reported_by=test_user.id)
    payload = {
        "root_cause": "Test",
        "resolution": "Test",
    }
    # Resolve once
    await client.patch(
        f"/api/v1/incidents/{incident.id}/resolve", json=payload, headers=auth_headers
    )
    # Resolve again
    response = await client.patch(
        f"/api/v1/incidents/{incident.id}/resolve", json=payload, headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_incident_stats(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User
):
    """Test getting incident statistics."""
    await _create_incident(
        db_session, reported_by=test_user.id, severity=IncidentSeverity.P1_critical
    )
    await _create_incident(
        db_session, reported_by=test_user.id, severity=IncidentSeverity.P3_medium
    )
    response = await client.get("/api/v1/incidents/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "p1_critical" in data
    assert "p2_high" in data
    assert "p3_medium" in data
    assert "p4_low" in data
    assert "open_incidents" in data
    assert "mttr_hours" in data


# ---------------------------------------------------------------------------
# Threat indicator endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_threats(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing threat indicators."""
    await _create_threat(db_session)
    response = await client.get("/api/v1/incidents/threats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_threat(client: AsyncClient, auth_headers: dict):
    """Test creating a new threat indicator."""
    payload = {
        "indicator_type": "ip_address",
        "value": "10.0.0.99",
        "threat_level": "critical",
        "source": "SIEM",
        "description": "Known C2 server",
    }
    response = await client.post(
        "/api/v1/incidents/threats", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["indicator_type"] == "ip_address"
    assert data["value"] == "10.0.0.99"
    assert data["threat_level"] == "critical"
    assert data["is_active"] is True
