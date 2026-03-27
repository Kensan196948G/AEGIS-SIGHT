"""IP address management and network topology endpoints."""

import ipaddress
import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.ip_management import (
    AssignmentStatus,
    AssignmentType,
    IPAssignment,
    IPRange,
)
from app.models.user import User
from app.schemas.ip_management import (
    IPAssignmentCreate,
    IPAssignmentResponse,
    IPConflict,
    IPRangeCreate,
    IPRangeDetailResponse,
    IPRangeResponse,
    IPRangeUtilization,
    TopologyEdge,
    TopologyNode,
    TopologyResponse,
)

router = APIRouter(prefix="/network", tags=["ip-management"])


# ---------------------------------------------------------------------------
# IP Ranges
# ---------------------------------------------------------------------------


@router.get(
    "/ip-ranges",
    response_model=PaginatedResponse[IPRangeResponse],
    summary="List IP ranges",
)
async def list_ip_ranges(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    location: str | None = Query(None, description="Filter by location"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return a paginated list of all IP ranges."""
    base_query = select(IPRange)
    count_query = select(func.count(IPRange.id))

    if location is not None:
        base_query = base_query.where(IPRange.location == location)
        count_query = count_query.where(IPRange.location == location)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(IPRange.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/ip-ranges",
    response_model=IPRangeResponse,
    status_code=201,
    summary="Create an IP range",
)
async def create_ip_range(
    data: IPRangeCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new IP range (CIDR notation)."""
    # Validate CIDR
    try:
        ipaddress.ip_network(data.network_address, strict=False)
    except ValueError as exc:
        raise BadRequestError(f"Invalid CIDR notation: {exc}")

    # Check uniqueness
    existing = await db.execute(
        select(IPRange).where(IPRange.network_address == data.network_address)
    )
    if existing.scalar_one_or_none() is not None:
        raise BadRequestError(
            f"IP range '{data.network_address}' already exists"
        )

    ip_range = IPRange(
        network_address=data.network_address,
        name=data.name,
        vlan_id=data.vlan_id,
        gateway=data.gateway,
        dns_servers=data.dns_servers,
        dhcp_enabled=data.dhcp_enabled,
        location=data.location,
        description=data.description,
    )
    db.add(ip_range)
    await db.flush()
    await db.refresh(ip_range)
    return ip_range


@router.get(
    "/ip-ranges/{range_id}",
    response_model=IPRangeDetailResponse,
    summary="Get IP range detail with assignments",
    responses={404: {"description": "IP range not found"}},
)
async def get_ip_range(
    range_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return an IP range with all its assignments."""
    result = await db.execute(select(IPRange).where(IPRange.id == range_id))
    ip_range = result.scalar_one_or_none()
    if ip_range is None:
        raise NotFoundError("IPRange", str(range_id))
    return ip_range


@router.get(
    "/ip-ranges/{range_id}/utilization",
    response_model=IPRangeUtilization,
    summary="Get IP range utilization",
    responses={404: {"description": "IP range not found"}},
)
async def get_ip_range_utilization(
    range_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Calculate utilization statistics for an IP range."""
    result = await db.execute(select(IPRange).where(IPRange.id == range_id))
    ip_range = result.scalar_one_or_none()
    if ip_range is None:
        raise NotFoundError("IPRange", str(range_id))

    network = ipaddress.ip_network(ip_range.network_address, strict=False)
    total_hosts = max(network.num_addresses - 2, 1)  # exclude network & broadcast

    # Count assignments by status
    assigned_result = await db.execute(
        select(func.count(IPAssignment.id)).where(
            IPAssignment.range_id == range_id
        )
    )
    assigned_count = assigned_result.scalar_one()

    active_result = await db.execute(
        select(func.count(IPAssignment.id)).where(
            IPAssignment.range_id == range_id,
            IPAssignment.status == AssignmentStatus.active,
        )
    )
    active_count = active_result.scalar_one()

    reserved_result = await db.execute(
        select(func.count(IPAssignment.id)).where(
            IPAssignment.range_id == range_id,
            IPAssignment.status == AssignmentStatus.reserved,
        )
    )
    reserved_count = reserved_result.scalar_one()

    utilization = round((assigned_count / total_hosts) * 100, 2) if total_hosts > 0 else 0.0

    return IPRangeUtilization(
        range_id=ip_range.id,
        network_address=ip_range.network_address,
        name=ip_range.name,
        total_hosts=total_hosts,
        assigned_count=assigned_count,
        active_count=active_count,
        reserved_count=reserved_count,
        utilization_percent=utilization,
    )


# ---------------------------------------------------------------------------
# IP Assignments
# ---------------------------------------------------------------------------


@router.get(
    "/ip-assignments",
    response_model=PaginatedResponse[IPAssignmentResponse],
    summary="List IP assignments",
)
async def list_ip_assignments(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    range_id: uuid.UUID | None = Query(None, alias="range", description="Filter by range ID"),
    status: AssignmentStatus | None = Query(None, description="Filter by status"),
    assignment_type: AssignmentType | None = Query(None, alias="type", description="Filter by type"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return a paginated list of IP assignments with optional filters."""
    base_query = select(IPAssignment)
    count_query = select(func.count(IPAssignment.id))

    if range_id is not None:
        base_query = base_query.where(IPAssignment.range_id == range_id)
        count_query = count_query.where(IPAssignment.range_id == range_id)
    if status is not None:
        base_query = base_query.where(IPAssignment.status == status)
        count_query = count_query.where(IPAssignment.status == status)
    if assignment_type is not None:
        base_query = base_query.where(IPAssignment.assignment_type == assignment_type)
        count_query = count_query.where(IPAssignment.assignment_type == assignment_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(IPAssignment.last_seen.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/ip-assignments",
    response_model=IPAssignmentResponse,
    status_code=201,
    summary="Create an IP assignment",
)
async def create_ip_assignment(
    data: IPAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new IP assignment within a range."""
    # Verify range exists
    range_result = await db.execute(
        select(IPRange).where(IPRange.id == data.range_id)
    )
    ip_range = range_result.scalar_one_or_none()
    if ip_range is None:
        raise NotFoundError("IPRange", str(data.range_id))

    # Validate IP belongs to range
    try:
        network = ipaddress.ip_network(ip_range.network_address, strict=False)
        addr = ipaddress.ip_address(data.ip_address)
        if addr not in network:
            raise BadRequestError(
                f"IP {data.ip_address} is not within range {ip_range.network_address}"
            )
    except ValueError as exc:
        raise BadRequestError(f"Invalid IP address: {exc}")

    assignment = IPAssignment(
        ip_address=data.ip_address,
        mac_address=data.mac_address,
        hostname=data.hostname,
        device_id=data.device_id,
        range_id=data.range_id,
        assignment_type=data.assignment_type,
        status=data.status,
        notes=data.notes,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


# ---------------------------------------------------------------------------
# Conflict detection
# ---------------------------------------------------------------------------


@router.get(
    "/ip-assignments/conflicts",
    response_model=list[IPConflict],
    summary="Detect IP address conflicts",
)
async def detect_conflicts(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Find IP addresses assigned to multiple active records."""
    # Find IPs with more than one active assignment
    conflict_ips_query = (
        select(IPAssignment.ip_address)
        .where(IPAssignment.status == AssignmentStatus.active)
        .group_by(IPAssignment.ip_address)
        .having(func.count(IPAssignment.id) > 1)
    )
    conflict_ips_result = await db.execute(conflict_ips_query)
    conflict_ips = [row[0] for row in conflict_ips_result.all()]

    if not conflict_ips:
        return []

    # Fetch all assignments for conflicting IPs
    assignments_result = await db.execute(
        select(IPAssignment).where(
            IPAssignment.ip_address.in_(conflict_ips),
            IPAssignment.status == AssignmentStatus.active,
        )
    )
    assignments = assignments_result.scalars().all()

    grouped: dict[str, list] = defaultdict(list)
    for a in assignments:
        grouped[a.ip_address].append(a)

    return [
        IPConflict(ip_address=ip, assignments=items)
        for ip, items in grouped.items()
    ]


# ---------------------------------------------------------------------------
# Topology
# ---------------------------------------------------------------------------


@router.get(
    "/topology",
    response_model=TopologyResponse,
    summary="Get network topology data",
)
async def get_topology(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Build a node/edge graph of IP ranges, gateways, and assignments."""
    ranges_result = await db.execute(select(IPRange))
    ranges = ranges_result.scalars().all()

    nodes: list[TopologyNode] = []
    edges: list[TopologyEdge] = []

    for r in ranges:
        # Range node
        range_node_id = f"range-{r.id}"
        nodes.append(TopologyNode(
            id=range_node_id,
            label=f"{r.name} ({r.network_address})",
            type="range",
            ip_address=r.network_address,
        ))

        # Gateway node
        if r.gateway:
            gw_node_id = f"gw-{r.gateway}"
            # Avoid duplicate gateway nodes
            if not any(n.id == gw_node_id for n in nodes):
                nodes.append(TopologyNode(
                    id=gw_node_id,
                    label=f"GW {r.gateway}",
                    type="gateway",
                    ip_address=r.gateway,
                ))
            edges.append(TopologyEdge(
                source=gw_node_id,
                target=range_node_id,
                label="gateway",
            ))

        # Assignment nodes
        for a in r.assignments:
            device_node_id = f"device-{a.id}"
            nodes.append(TopologyNode(
                id=device_node_id,
                label=a.hostname or a.ip_address,
                type="device",
                ip_address=a.ip_address,
                status=a.status.value,
            ))
            edges.append(TopologyEdge(
                source=range_node_id,
                target=device_node_id,
            ))

    return TopologyResponse(nodes=nodes, edges=edges)
