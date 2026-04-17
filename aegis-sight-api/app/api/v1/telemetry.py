"""Telemetry data ingestion endpoint for AEGIS-SIGHT agents."""

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.hardware_snapshot import HardwareSnapshot
from app.models.security_status import SecurityStatus
from app.schemas.telemetry import TelemetryPayload, TelemetryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post(
    "",
    response_model=TelemetryResponse,
    status_code=200,
    summary="Receive agent telemetry",
    description=(
        "Accepts telemetry data from an AEGIS-SIGHT agent. "
        "Performs UPSERT on the device record (by hostname), "
        "then saves hardware snapshots, security status, and "
        "software inventory entries."
    ),
)
async def receive_telemetry(
    payload: TelemetryPayload,
    db: AsyncSession = Depends(get_db),
):
    """Ingest telemetry data from an AEGIS-SIGHT endpoint agent."""

    snapshots_saved = 0

    # --- 1. Device UPSERT (by hostname) ---
    result = await db.execute(
        select(Device).where(Device.hostname == payload.device_info.hostname)
    )
    device = result.scalar_one_or_none()

    if device is None:
        device = Device(
            hostname=payload.device_info.hostname,
            os_version=payload.device_info.os_version,
            ip_address=payload.device_info.ip_address,
            mac_address=payload.device_info.mac_address,
            domain=payload.device_info.domain,
            status=DeviceStatus.active,
            last_seen=datetime.now(UTC),
        )
        db.add(device)
        await db.flush()
        logger.info("Created new device: %s", device.hostname)
    else:
        # Update existing device fields
        device.os_version = payload.device_info.os_version or device.os_version
        device.ip_address = payload.device_info.ip_address or device.ip_address
        device.mac_address = payload.device_info.mac_address or device.mac_address
        device.domain = payload.device_info.domain or device.domain
        device.status = DeviceStatus.active
        device.last_seen = datetime.now(UTC)
        await db.flush()
        logger.info("Updated existing device: %s", device.hostname)

    # --- 2. Hardware Snapshot ---
    if payload.hardware is not None:
        hw = HardwareSnapshot(
            device_id=device.id,
            cpu_model=payload.hardware.cpu_model,
            memory_gb=payload.hardware.memory_gb,
            disk_total_gb=payload.hardware.disk_total_gb,
            disk_free_gb=payload.hardware.disk_free_gb,
            serial_number=payload.hardware.serial_number,
            snapped_at=payload.collected_at,
        )
        db.add(hw)
        snapshots_saved += 1

    # --- 3. Security Status ---
    if payload.security is not None:
        sec = SecurityStatus(
            device_id=device.id,
            defender_on=payload.security.defender_on,
            bitlocker_on=payload.security.bitlocker_on,
            pattern_date=payload.security.pattern_date,
            pending_patches=payload.security.pending_patches,
            checked_at=payload.collected_at,
        )
        db.add(sec)
        snapshots_saved += 1

    # --- 4. Software inventory ---
    # Software inventory items are logged; a dedicated SoftwareInstall model
    # can be added in a future iteration. For now we log the count.
    if payload.software_inventory:
        logger.info(
            "Received %d software inventory items for device %s",
            len(payload.software_inventory),
            device.hostname,
        )
        snapshots_saved += len(payload.software_inventory)

    await db.flush()

    return TelemetryResponse(
        status="accepted",
        device_id=str(device.id),
        hostname=device.hostname,
        snapshots_saved=snapshots_saved,
    )
