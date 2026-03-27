"""Security monitoring endpoints."""

import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.models.device import Device
from app.models.security_status import SecurityStatus
from app.models.user import User
from app.schemas.security import (
    BitLockerSummary,
    DefenderSummary,
    DeviceSecurityDetail,
    PatchSummary,
    SecurityOverview,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/security", tags=["security"])


@router.get(
    "/overview",
    response_model=SecurityOverview,
    summary="Security overview",
    description=(
        "Returns an aggregated security overview including Windows Defender status, "
        "BitLocker encryption status, and pending patch statistics across all devices."
    ),
)
async def get_security_overview(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Aggregate security posture across all devices.

    Uses the latest security status per device (by MAX checked_at) to compute
    Defender, BitLocker, and patch summaries.
    """

    # Subquery: latest security status ID per device
    latest_subq = (
        select(
            SecurityStatus.device_id,
            func.max(SecurityStatus.id).label("latest_id"),
        )
        .group_by(SecurityStatus.device_id)
        .subquery()
    )

    # Join to get only latest rows
    latest_statuses = (
        select(SecurityStatus)
        .join(latest_subq, SecurityStatus.id == latest_subq.c.latest_id)
    )

    result = await db.execute(latest_statuses)
    statuses = result.scalars().all()

    total = len(statuses)
    if total == 0:
        return SecurityOverview()

    defender_on = sum(1 for s in statuses if s.defender_on)
    defender_off = total - defender_on

    bitlocker_on = sum(1 for s in statuses if s.bitlocker_on)
    bitlocker_off = total - bitlocker_on

    total_pending = sum(s.pending_patches for s in statuses)
    devices_with_pending = sum(1 for s in statuses if s.pending_patches > 0)
    devices_fully_patched = total - devices_with_pending

    return SecurityOverview(
        total_devices_with_status=total,
        defender=DefenderSummary(
            enabled_count=defender_on,
            disabled_count=defender_off,
            enabled_percentage=round((defender_on / total) * 100, 1),
        ),
        bitlocker=BitLockerSummary(
            enabled_count=bitlocker_on,
            disabled_count=bitlocker_off,
            enabled_percentage=round((bitlocker_on / total) * 100, 1),
        ),
        patches=PatchSummary(
            total_pending=total_pending,
            devices_with_pending=devices_with_pending,
            devices_fully_patched=devices_fully_patched,
        ),
    )


@router.get(
    "/devices/{device_id}",
    response_model=DeviceSecurityDetail,
    summary="Device security detail",
    description="Returns the latest security status for a specific device.",
    responses={404: {"description": "Device not found or no security data available"}},
)
async def get_device_security(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get the latest security status for a specific device."""

    # Verify device exists
    device_result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = device_result.scalar_one_or_none()
    if device is None:
        raise NotFoundError("Device", str(device_id))

    # Get latest security status
    sec_result = await db.execute(
        select(SecurityStatus)
        .where(SecurityStatus.device_id == device_id)
        .order_by(SecurityStatus.checked_at.desc())
        .limit(1)
    )
    sec = sec_result.scalar_one_or_none()

    if sec is None:
        raise NotFoundError("Security data for device", str(device_id))

    return DeviceSecurityDetail(
        device_id=device.id,
        hostname=device.hostname,
        os_version=device.os_version,
        defender_on=sec.defender_on,
        bitlocker_on=sec.bitlocker_on,
        pattern_date=sec.pattern_date,
        pending_patches=sec.pending_patches,
        last_checked_at=sec.checked_at,
    )
