"""Remote work (VPN / telework) API endpoints."""

import uuid
from datetime import datetime, timezone, UTC

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.remote_work import RemoteAccessPolicy, VPNConnection, VPNProtocol
from app.models.user import User
from app.schemas.remote_work import (
    RemoteAccessPolicyCreate,
    RemoteAccessPolicyResponse,
    RemoteWorkAnalytics,
    VPNConnectionCreate,
    VPNConnectionResponse,
    VPNDisconnectRequest,
)

router = APIRouter(prefix="/remote", tags=["remote-work"])


# ---------------------------------------------------------------------------
# VPN Connections
# ---------------------------------------------------------------------------
@router.get(
    "/vpn",
    response_model=PaginatedResponse[VPNConnectionResponse],
    summary="List VPN connections",
    description="Retrieve a paginated list of VPN connections.",
)
async def list_vpn_connections(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    protocol: VPNProtocol | None = Query(None),
    user_name: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all VPN connections with optional filters."""
    base_query = select(VPNConnection)
    count_query = select(func.count(VPNConnection.id))

    if protocol is not None:
        base_query = base_query.where(VPNConnection.protocol == protocol)
        count_query = count_query.where(VPNConnection.protocol == protocol)

    if user_name is not None:
        base_query = base_query.where(VPNConnection.user_name == user_name)
        count_query = count_query.where(VPNConnection.user_name == user_name)

    if date_from is not None:
        base_query = base_query.where(VPNConnection.connected_at >= date_from)
        count_query = count_query.where(VPNConnection.connected_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(VPNConnection.connected_at <= date_to)
        count_query = count_query.where(VPNConnection.connected_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(VPNConnection.connected_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/vpn/active",
    response_model=PaginatedResponse[VPNConnectionResponse],
    summary="List active VPN connections",
    description="Retrieve currently active VPN connections.",
)
async def list_active_vpn_connections(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List active VPN connections."""
    base_query = select(VPNConnection).where(VPNConnection.is_active.is_(True))
    count_query = select(func.count(VPNConnection.id)).where(
        VPNConnection.is_active.is_(True)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(VPNConnection.connected_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/vpn",
    response_model=VPNConnectionResponse,
    status_code=201,
    summary="Record VPN connection",
    description="Record a new VPN connection event.",
)
async def create_vpn_connection(
    data: VPNConnectionCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a new VPN connection."""
    conn = VPNConnection(**data.model_dump())
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn


@router.patch(
    "/vpn/{connection_id}/disconnect",
    response_model=VPNConnectionResponse,
    summary="Record VPN disconnection",
    description="Mark a VPN connection as disconnected and record bandwidth usage.",
    responses={404: {"description": "VPN connection not found"}},
)
async def disconnect_vpn(
    connection_id: uuid.UUID,
    data: VPNDisconnectRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a VPN disconnection."""
    result = await db.execute(
        select(VPNConnection).where(VPNConnection.id == connection_id)
    )
    conn = result.scalar_one_or_none()
    if conn is None:
        raise NotFoundError("VPNConnection", str(connection_id))

    now = datetime.now(UTC)
    conn.disconnected_at = now
    conn.is_active = False
    conn.duration_minutes = int((now - conn.connected_at).total_seconds() / 60)

    if data.bytes_sent is not None:
        conn.bytes_sent = data.bytes_sent
    if data.bytes_received is not None:
        conn.bytes_received = data.bytes_received

    await db.flush()
    await db.refresh(conn)
    return conn


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@router.get(
    "/analytics",
    response_model=RemoteWorkAnalytics,
    summary="Remote work analytics",
    description="Get telework utilization analytics including peak hours and bandwidth.",
)
async def remote_work_analytics(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get remote work analytics."""
    # Total connections
    total_result = await db.execute(select(func.count(VPNConnection.id)))
    total_connections = total_result.scalar_one()

    # Active connections
    active_result = await db.execute(
        select(func.count(VPNConnection.id)).where(VPNConnection.is_active.is_(True))
    )
    active_connections = active_result.scalar_one()

    # By protocol
    by_protocol: dict[str, int] = {}
    for proto in VPNProtocol:
        proto_result = await db.execute(
            select(func.count(VPNConnection.id)).where(
                VPNConnection.protocol == proto
            )
        )
        by_protocol[proto.value] = proto_result.scalar_one()

    # Total bandwidth
    bytes_sent_result = await db.execute(
        select(func.coalesce(func.sum(VPNConnection.bytes_sent), 0))
    )
    total_bytes_sent = bytes_sent_result.scalar_one()

    bytes_recv_result = await db.execute(
        select(func.coalesce(func.sum(VPNConnection.bytes_received), 0))
    )
    total_bytes_received = bytes_recv_result.scalar_one()

    # Peak hours (group by hour of connected_at)
    peak_hours_result = await db.execute(
        select(
            func.extract("hour", VPNConnection.connected_at).label("hour"),
            func.count(VPNConnection.id).label("count"),
        )
        .group_by(func.extract("hour", VPNConnection.connected_at))
        .order_by(func.extract("hour", VPNConnection.connected_at))
    )
    peak_hours = [
        {"hour": int(row.hour), "count": row.count}
        for row in peak_hours_result.all()
    ]

    # Unique users for utilization rate
    unique_users_result = await db.execute(
        select(func.count(func.distinct(VPNConnection.user_name)))
    )
    unique_users = unique_users_result.scalar_one() or 1

    utilization_rate = active_connections / unique_users if unique_users > 0 else 0.0

    # Top users
    top_users_result = await db.execute(
        select(
            VPNConnection.user_name,
            func.count(VPNConnection.id).label("connection_count"),
            func.coalesce(func.sum(VPNConnection.duration_minutes), 0).label(
                "total_minutes"
            ),
        )
        .group_by(VPNConnection.user_name)
        .order_by(func.count(VPNConnection.id).desc())
        .limit(10)
    )
    top_users = [
        {
            "user_name": row.user_name,
            "connection_count": row.connection_count,
            "total_minutes": int(row.total_minutes),
        }
        for row in top_users_result.all()
    ]

    return RemoteWorkAnalytics(
        total_connections=total_connections,
        active_connections=active_connections,
        by_protocol=by_protocol,
        total_bytes_sent=total_bytes_sent,
        total_bytes_received=total_bytes_received,
        peak_hours=peak_hours,
        utilization_rate=round(utilization_rate, 3),
        top_users=top_users,
    )


# ---------------------------------------------------------------------------
# Remote Access Policies
# ---------------------------------------------------------------------------
@router.get(
    "/policies",
    response_model=PaginatedResponse[RemoteAccessPolicyResponse],
    summary="List remote access policies",
    description="Retrieve all remote access policies.",
)
async def list_policies(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_enabled: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List remote access policies."""
    base_query = select(RemoteAccessPolicy)
    count_query = select(func.count(RemoteAccessPolicy.id))

    if is_enabled is not None:
        base_query = base_query.where(RemoteAccessPolicy.is_enabled == is_enabled)
        count_query = count_query.where(RemoteAccessPolicy.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset)
        .limit(limit)
        .order_by(RemoteAccessPolicy.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/policies",
    response_model=RemoteAccessPolicyResponse,
    status_code=201,
    summary="Create remote access policy",
    description="Create a new remote access policy.",
)
async def create_policy(
    data: RemoteAccessPolicyCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new remote access policy."""
    policy = RemoteAccessPolicy(**data.model_dump())
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy
