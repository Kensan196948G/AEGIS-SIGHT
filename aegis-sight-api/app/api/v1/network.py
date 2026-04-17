import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.device import Device
from app.models.network_device import NetworkDevice
from app.models.user import User
from app.schemas.network_device import (
    NetworkDeviceLinkRequest,
    NetworkDeviceResponse,
    NetworkScanRequest,
    NetworkScanResponse,
)

router = APIRouter(prefix="/network", tags=["network"])


@router.get(
    "/devices",
    response_model=PaginatedResponse[NetworkDeviceResponse],
    summary="List discovered network devices",
)
async def list_network_devices(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    device_type: str | None = Query(None, description="Filter by device type"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return a paginated list of all discovered network devices."""
    base_query = select(NetworkDevice)
    count_query = select(func.count(NetworkDevice.id))

    if device_type is not None:
        base_query = base_query.where(NetworkDevice.device_type == device_type)
        count_query = count_query.where(NetworkDevice.device_type == device_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(NetworkDevice.last_seen.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/unmanaged",
    response_model=PaginatedResponse[NetworkDeviceResponse],
    summary="List unmanaged network devices",
)
async def list_unmanaged_devices(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return network devices that are not linked to a managed device."""
    base_query = select(NetworkDevice).where(NetworkDevice.is_managed .is_(False))
    count_query = select(func.count(NetworkDevice.id)).where(
        NetworkDevice.is_managed .is_(False)
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(NetworkDevice.last_seen.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/scan",
    response_model=NetworkScanResponse,
    status_code=201,
    summary="Register network scan results",
)
async def register_scan(
    data: NetworkScanRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Upsert discovered devices from a network scan.

    For each entry, if a device with the same MAC address already exists its
    ``ip_address``, ``hostname``, ``device_type``, and ``last_seen`` fields
    are updated.  Otherwise a new record is created.
    """
    created = 0
    updated = 0
    now = datetime.now(UTC)

    for entry in data.devices:
        result = await db.execute(
            select(NetworkDevice).where(
                NetworkDevice.mac_address == entry.mac_address
            )
        )
        existing = result.scalar_one_or_none()

        if existing is not None:
            existing.ip_address = entry.ip_address
            existing.hostname = entry.hostname
            existing.device_type = entry.device_type
            existing.last_seen = now
            updated += 1
        else:
            device = NetworkDevice(
                ip_address=entry.ip_address,
                mac_address=entry.mac_address,
                hostname=entry.hostname,
                device_type=entry.device_type,
                first_seen=now,
                last_seen=now,
            )
            db.add(device)
            created += 1

    await db.flush()
    return NetworkScanResponse(created=created, updated=updated)


@router.patch(
    "/devices/{device_id}/link",
    response_model=NetworkDeviceResponse,
    summary="Link a network device to a managed device",
    responses={404: {"description": "Network device or managed device not found"}},
)
async def link_device(
    device_id: uuid.UUID,
    data: NetworkDeviceLinkRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Associate a discovered network device with an existing managed device."""
    result = await db.execute(
        select(NetworkDevice).where(NetworkDevice.id == device_id)
    )
    net_device = result.scalar_one_or_none()
    if net_device is None:
        raise NotFoundError("NetworkDevice", str(device_id))

    # Verify the target managed device exists
    managed_result = await db.execute(
        select(Device).where(Device.id == data.device_id)
    )
    managed_device = managed_result.scalar_one_or_none()
    if managed_device is None:
        raise NotFoundError("Device", str(data.device_id))

    net_device.device_id = data.device_id
    net_device.is_managed = True
    await db.flush()
    await db.refresh(net_device)
    return net_device
