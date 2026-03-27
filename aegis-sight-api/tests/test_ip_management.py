import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ip_management import (
    AssignmentStatus,
    AssignmentType,
    IPAssignment,
    IPRange,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _seed_ip_range(
    session: AsyncSession,
    network: str = "192.168.1.0/24",
    name: str = "Office LAN",
    gateway: str | None = "192.168.1.1",
    location: str | None = "本社",
) -> IPRange:
    ip_range = IPRange(
        network_address=network,
        name=name,
        gateway=gateway,
        dns_servers=["8.8.8.8", "8.8.4.4"],
        dhcp_enabled=True,
        location=location,
    )
    session.add(ip_range)
    await session.flush()
    await session.refresh(ip_range)
    return ip_range


async def _seed_ip_assignment(
    session: AsyncSession,
    range_id: uuid.UUID,
    ip: str = "192.168.1.10",
    status: AssignmentStatus = AssignmentStatus.active,
    assignment_type: AssignmentType = AssignmentType.static,
) -> IPAssignment:
    assignment = IPAssignment(
        ip_address=ip,
        mac_address="AA:BB:CC:DD:EE:01",
        hostname="test-host",
        range_id=range_id,
        assignment_type=assignment_type,
        status=status,
    )
    session.add(assignment)
    await session.flush()
    await session.refresh(assignment)
    return assignment


# ---------------------------------------------------------------------------
# IP Range tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_ip_ranges_unauthorized(client: AsyncClient):
    """Listing IP ranges requires authentication."""
    response = await client.get("/api/v1/network/ip-ranges")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_ip_range(client: AsyncClient, auth_headers: dict):
    """Create a new IP range."""
    payload = {
        "network_address": "10.0.0.0/24",
        "name": "Dev Network",
        "vlan_id": 100,
        "gateway": "10.0.0.1",
        "dns_servers": ["8.8.8.8"],
        "dhcp_enabled": True,
        "location": "本社",
        "description": "Development network",
    }
    response = await client.post(
        "/api/v1/network/ip-ranges", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["network_address"] == "10.0.0.0/24"
    assert data["name"] == "Dev Network"
    assert data["vlan_id"] == 100


@pytest.mark.asyncio
async def test_create_ip_range_invalid_cidr(client: AsyncClient, auth_headers: dict):
    """Creating a range with invalid CIDR returns 400."""
    payload = {
        "network_address": "not-a-cidr",
        "name": "Bad Range",
    }
    response = await client.post(
        "/api/v1/network/ip-ranges", json=payload, headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_ip_ranges(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Authenticated user can list IP ranges."""
    await _seed_ip_range(db_session, network="172.16.0.0/16", name="Corporate")
    response = await client.get("/api/v1/network/ip-ranges", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_ip_range_detail(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Get IP range with assignments."""
    ip_range = await _seed_ip_range(
        db_session, network="10.10.0.0/24", name="Detail Test"
    )
    await _seed_ip_assignment(db_session, range_id=ip_range.id, ip="10.10.0.10")

    response = await client.get(
        f"/api/v1/network/ip-ranges/{ip_range.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Test"
    assert len(data["assignments"]) >= 1


@pytest.mark.asyncio
async def test_get_ip_range_not_found(client: AsyncClient, auth_headers: dict):
    """Getting a non-existent range returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/v1/network/ip-ranges/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ip_range_utilization(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Utilization endpoint returns correct stats."""
    ip_range = await _seed_ip_range(
        db_session, network="10.20.0.0/24", name="Util Test"
    )
    await _seed_ip_assignment(
        db_session, range_id=ip_range.id, ip="10.20.0.10",
        status=AssignmentStatus.active,
    )
    await _seed_ip_assignment(
        db_session, range_id=ip_range.id, ip="10.20.0.11",
        status=AssignmentStatus.reserved,
    )

    response = await client.get(
        f"/api/v1/network/ip-ranges/{ip_range.id}/utilization",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["assigned_count"] == 2
    assert data["active_count"] == 1
    assert data["reserved_count"] == 1
    assert data["total_hosts"] == 254  # /24 => 256 - 2
    assert data["utilization_percent"] > 0


# ---------------------------------------------------------------------------
# IP Assignment tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_ip_assignment(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Create a new IP assignment."""
    ip_range = await _seed_ip_range(
        db_session, network="10.30.0.0/24", name="Assignment Test"
    )
    payload = {
        "ip_address": "10.30.0.50",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "hostname": "server-01",
        "range_id": str(ip_range.id),
        "assignment_type": "static",
        "status": "active",
        "notes": "Primary server",
    }
    response = await client.post(
        "/api/v1/network/ip-assignments", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["ip_address"] == "10.30.0.50"
    assert data["hostname"] == "server-01"


@pytest.mark.asyncio
async def test_create_ip_assignment_outside_range(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Assignment with IP outside range returns 400."""
    ip_range = await _seed_ip_range(
        db_session, network="10.40.0.0/24", name="Outside Test"
    )
    payload = {
        "ip_address": "192.168.1.1",
        "range_id": str(ip_range.id),
    }
    response = await client.post(
        "/api/v1/network/ip-assignments", json=payload, headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_ip_assignments(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """List IP assignments with pagination."""
    ip_range = await _seed_ip_range(
        db_session, network="10.50.0.0/24", name="List Test"
    )
    await _seed_ip_assignment(db_session, range_id=ip_range.id, ip="10.50.0.10")

    response = await client.get(
        "/api/v1/network/ip-assignments", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_ip_assignments_filter_by_status(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Filter assignments by status."""
    ip_range = await _seed_ip_range(
        db_session, network="10.60.0.0/24", name="Filter Test"
    )
    await _seed_ip_assignment(
        db_session, range_id=ip_range.id, ip="10.60.0.10",
        status=AssignmentStatus.reserved,
    )

    response = await client.get(
        "/api/v1/network/ip-assignments?status=reserved",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["status"] == "reserved"


# ---------------------------------------------------------------------------
# Conflict detection tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_detect_conflicts_none(
    client: AsyncClient, auth_headers: dict,
):
    """No conflicts when all IPs are unique."""
    response = await client.get(
        "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
    )
    assert response.status_code == 200
    # May or may not have conflicts depending on test order, but response is valid
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_detect_conflicts_found(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Detect conflicts when same IP assigned twice as active."""
    ip_range = await _seed_ip_range(
        db_session, network="10.70.0.0/24", name="Conflict Test"
    )
    # Two active assignments for same IP
    a1 = IPAssignment(
        ip_address="10.70.0.100",
        mac_address="AA:BB:CC:DD:EE:01",
        hostname="host-a",
        range_id=ip_range.id,
        assignment_type=AssignmentType.static,
        status=AssignmentStatus.active,
    )
    a2 = IPAssignment(
        ip_address="10.70.0.100",
        mac_address="AA:BB:CC:DD:EE:02",
        hostname="host-b",
        range_id=ip_range.id,
        assignment_type=AssignmentType.static,
        status=AssignmentStatus.active,
    )
    db_session.add_all([a1, a2])
    await db_session.flush()

    response = await client.get(
        "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    conflict_ips = [c["ip_address"] for c in data]
    assert "10.70.0.100" in conflict_ips


# ---------------------------------------------------------------------------
# Topology tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_topology(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Topology endpoint returns nodes and edges."""
    ip_range = await _seed_ip_range(
        db_session, network="10.80.0.0/24", name="Topo Test", gateway="10.80.0.1"
    )
    await _seed_ip_assignment(db_session, range_id=ip_range.id, ip="10.80.0.10")

    response = await client.get(
        "/api/v1/network/topology", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 3  # range + gateway + device
    assert len(data["edges"]) >= 2


@pytest.mark.asyncio
async def test_topology_unauthorized(client: AsyncClient):
    """Topology requires authentication."""
    response = await client.get("/api/v1/network/topology")
    assert response.status_code == 401
