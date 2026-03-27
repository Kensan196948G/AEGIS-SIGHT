"""Dashboard statistics and alerts endpoints."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.device import Device, DeviceStatus
from app.models.license import SoftwareLicense
from app.models.procurement import ProcurementRequest, ProcurementStatus
from app.models.security_status import SecurityStatus
from app.models.user import User
from app.schemas.dashboard import AlertItem, AlertListResponse, DashboardStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Dashboard statistics",
    description=(
        "Returns aggregated statistics for the dashboard: total devices, "
        "online devices, license counts, compliance rate, pending procurements, "
        "and active alert count."
    ),
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Aggregate key metrics for the dashboard overview."""

    # Total devices
    total_result = await db.execute(select(func.count(Device.id)))
    total_devices = total_result.scalar_one()

    # Online devices (active + seen in last 30 minutes)
    online_cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    online_result = await db.execute(
        select(func.count(Device.id)).where(
            Device.status == DeviceStatus.active,
            Device.last_seen >= online_cutoff,
        )
    )
    online_devices = online_result.scalar_one()

    # Total licenses
    license_result = await db.execute(select(func.count(SoftwareLicense.id)))
    total_licenses = license_result.scalar_one()

    # Compliance rate: licenses where installed_count <= purchased_count
    if total_licenses > 0:
        compliant_result = await db.execute(
            select(func.count(SoftwareLicense.id)).where(
                SoftwareLicense.installed_count <= SoftwareLicense.purchased_count
            )
        )
        compliant_count = compliant_result.scalar_one()
        compliance_rate = round((compliant_count / total_licenses) * 100, 1)
    else:
        compliance_rate = 100.0

    # Pending procurements (draft or submitted)
    pending_result = await db.execute(
        select(func.count(ProcurementRequest.id)).where(
            ProcurementRequest.status.in_([
                ProcurementStatus.draft,
                ProcurementStatus.submitted,
            ])
        )
    )
    pending_procurements = pending_result.scalar_one()

    # Active alerts: devices with Defender OFF or pending patches > 0
    alerts_result = await db.execute(
        select(func.count(func.distinct(SecurityStatus.device_id))).where(
            (SecurityStatus.defender_on == False)  # noqa: E712
            | (SecurityStatus.pending_patches > 0)
        )
    )
    active_alerts = alerts_result.scalar_one()

    return DashboardStats(
        total_devices=total_devices,
        online_devices=online_devices,
        total_licenses=total_licenses,
        compliance_rate=compliance_rate,
        pending_procurements=pending_procurements,
        active_alerts=active_alerts,
    )


@router.get(
    "/alerts",
    response_model=AlertListResponse,
    summary="Recent alerts",
    description="Returns recent security and compliance alerts.",
)
async def get_dashboard_alerts(
    limit: int = Query(20, ge=1, le=100, description="Max alerts to return"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List recent alerts derived from security statuses."""

    # Build alerts from security statuses that have issues
    query = (
        select(SecurityStatus, Device.hostname)
        .join(Device, SecurityStatus.device_id == Device.id)
        .where(
            (SecurityStatus.defender_on == False)  # noqa: E712
            | (SecurityStatus.pending_patches > 0)
            | (SecurityStatus.bitlocker_on == False)  # noqa: E712
        )
        .order_by(SecurityStatus.checked_at.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    alerts: list[AlertItem] = []
    for sec_status, hostname in rows:
        if not sec_status.defender_on:
            alerts.append(
                AlertItem(
                    id=f"def-{sec_status.id}",
                    severity="high",
                    title="Windows Defender disabled",
                    description=f"Windows Defender is disabled on {hostname}",
                    device_hostname=hostname,
                    created_at=sec_status.checked_at,
                )
            )
        if sec_status.pending_patches > 0:
            alerts.append(
                AlertItem(
                    id=f"patch-{sec_status.id}",
                    severity="medium",
                    title="Pending patches",
                    description=(
                        f"{sec_status.pending_patches} patches pending on {hostname}"
                    ),
                    device_hostname=hostname,
                    created_at=sec_status.checked_at,
                )
            )
        if not sec_status.bitlocker_on:
            alerts.append(
                AlertItem(
                    id=f"bl-{sec_status.id}",
                    severity="medium",
                    title="BitLocker disabled",
                    description=f"BitLocker encryption is disabled on {hostname}",
                    device_hostname=hostname,
                    created_at=sec_status.checked_at,
                )
            )

    # Sort by created_at descending and trim to limit
    alerts.sort(key=lambda a: a.created_at, reverse=True)
    alerts = alerts[:limit]

    return AlertListResponse(alerts=alerts, total=len(alerts))
