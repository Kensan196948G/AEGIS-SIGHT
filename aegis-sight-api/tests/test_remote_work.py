"""Remote work (VPN / telework) API endpoint tests."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.remote_work import RemoteAccessPolicy, VPNConnection, VPNProtocol


async def _create_vpn_connection(
    db: AsyncSession,
    user_name: str = "test-user",
    protocol: VPNProtocol = VPNProtocol.wireguard,
    vpn_server: str = "vpn-tokyo-01.company.com",
    client_ip: str = "203.0.113.10",
    assigned_ip: str = "10.8.0.2",
    is_active: bool = True,
) -> VPNConnection:
    """Helper to insert a test VPN connection."""
    conn = VPNConnection(
        user_name=user_name,
        vpn_server=vpn_server,
        client_ip=client_ip,
        assigned_ip=assigned_ip,
        protocol=protocol,
        is_active=is_active,
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn


async def _create_policy(
    db: AsyncSession,
    name: str = "Test Policy",
) -> RemoteAccessPolicy:
    """Helper to insert a test remote access policy."""
    from datetime import time

    policy = RemoteAccessPolicy(
        name=name,
        allowed_hours_start=time(7, 0),
        allowed_hours_end=time(22, 0),
        allowed_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
        require_mfa=True,
        max_session_hours=10,
        is_enabled=True,
    )
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# VPN Connection list / filter tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_vpn_connections_unauthorized(client: AsyncClient):
    """Test that listing VPN connections requires authentication."""
    response = await client.get("/api/v1/remote/vpn")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_vpn_connections(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing VPN connections with authentication."""
    await _create_vpn_connection(
        db_session, user_name=f"vpn-user-{uuid.uuid4().hex[:6]}"
    )
    response = await client.get("/api/v1/remote/vpn", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_vpn_connections_filter_by_protocol(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering VPN connections by protocol."""
    await _create_vpn_connection(
        db_session,
        user_name=f"ipsec-user-{uuid.uuid4().hex[:6]}",
        protocol=VPNProtocol.ipsec,
    )
    response = await client.get(
        "/api/v1/remote/vpn?protocol=ipsec", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["protocol"] == "ipsec"


@pytest.mark.asyncio
async def test_list_active_vpn_connections(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing active VPN connections."""
    await _create_vpn_connection(
        db_session, user_name=f"active-{uuid.uuid4().hex[:6]}"
    )
    response = await client.get("/api/v1/remote/vpn/active", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    for item in data["items"]:
        assert item["is_active"] is True


# ---------------------------------------------------------------------------
# VPN Connection create / disconnect tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_create_vpn_connection(client: AsyncClient, auth_headers: dict):
    """Test creating a new VPN connection."""
    payload = {
        "user_name": f"new-vpn-{uuid.uuid4().hex[:6]}",
        "vpn_server": "vpn-osaka-01.company.com",
        "client_ip": "198.51.100.22",
        "assigned_ip": "10.8.0.10",
        "protocol": "ssl",
    }
    response = await client.post(
        "/api/v1/remote/vpn", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_name"] == payload["user_name"]
    assert data["protocol"] == "ssl"
    assert data["is_active"] is True
    assert data["vpn_server"] == "vpn-osaka-01.company.com"


@pytest.mark.asyncio
async def test_disconnect_vpn(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test disconnecting a VPN connection."""
    conn = await _create_vpn_connection(
        db_session, user_name=f"disconnect-{uuid.uuid4().hex[:6]}"
    )
    response = await client.patch(
        f"/api/v1/remote/vpn/{conn.id}/disconnect",
        json={"bytes_sent": 1048576, "bytes_received": 5242880},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["disconnected_at"] is not None
    assert data["duration_minutes"] is not None
    assert data["bytes_sent"] == 1048576
    assert data["bytes_received"] == 5242880


@pytest.mark.asyncio
async def test_disconnect_vpn_not_found(client: AsyncClient, auth_headers: dict):
    """Test disconnecting a non-existent VPN connection returns 404."""
    response = await client.patch(
        "/api/v1/remote/vpn/00000000-0000-0000-0000-000000000000/disconnect",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Analytics tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_remote_work_analytics(client: AsyncClient, auth_headers: dict):
    """Test remote work analytics endpoint."""
    response = await client.get(
        "/api/v1/remote/analytics", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_connections" in data
    assert "active_connections" in data
    assert "by_protocol" in data
    assert "total_bytes_sent" in data
    assert "total_bytes_received" in data
    assert "peak_hours" in data
    assert "utilization_rate" in data
    assert "top_users" in data


@pytest.mark.asyncio
async def test_remote_work_analytics_with_data(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test analytics with some connection data."""
    await _create_vpn_connection(
        db_session,
        user_name=f"analytics-{uuid.uuid4().hex[:6]}",
        protocol=VPNProtocol.wireguard,
    )
    response = await client.get(
        "/api/v1/remote/analytics", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_connections"] >= 1
    assert data["active_connections"] >= 1


# ---------------------------------------------------------------------------
# Policy tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_policies_unauthorized(client: AsyncClient):
    """Test that listing policies requires authentication."""
    response = await client.get("/api/v1/remote/policies")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_policies(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing remote access policies."""
    await _create_policy(db_session, name=f"policy-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/remote/policies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_policy(client: AsyncClient, auth_headers: dict):
    """Test creating a new remote access policy."""
    payload = {
        "name": f"test-policy-{uuid.uuid4().hex[:6]}",
        "allowed_hours_start": "08:00:00",
        "allowed_hours_end": "20:00:00",
        "allowed_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "require_mfa": True,
        "max_session_hours": 8,
        "geo_restriction": {"allowed_countries": ["JP", "US"]},
        "is_enabled": True,
    }
    response = await client.post(
        "/api/v1/remote/policies", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["require_mfa"] is True
    assert data["max_session_hours"] == 8
    assert data["allowed_days"] == payload["allowed_days"]
    assert data["geo_restriction"]["allowed_countries"] == ["JP", "US"]


@pytest.mark.asyncio
async def test_list_policies_filter_enabled(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering policies by enabled status."""
    await _create_policy(db_session, name=f"enabled-{uuid.uuid4().hex[:6]}")
    response = await client.get(
        "/api/v1/remote/policies?is_enabled=true", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_enabled"] is True
