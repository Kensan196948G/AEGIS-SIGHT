"""
Patch management & vulnerability tracking API.

Endpoints for Windows Update tracking, device patch compliance,
missing-patch reports, and CVE vulnerability management.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.device import Device
from app.models.patch import (
    DevicePatchStatus,
    PatchStatus,
    UpdateSeverity,
    Vulnerability,
    VulnerabilitySeverity,
    WindowsUpdate,
)
from app.models.user import User
from app.schemas.patch import (
    DevicePatchDetailResponse,
    DevicePatchStatusCreate,
    DevicePatchStatusResponse,
    MissingPatchEntry,
    PatchComplianceSummary,
    VulnerabilityCreate,
    VulnerabilityResponse,
    WindowsUpdateCreate,
    WindowsUpdateResponse,
)

router = APIRouter(prefix="/patches", tags=["patches"])


# ---------------------------------------------------------------------------
# Windows Updates
# ---------------------------------------------------------------------------

@router.get(
    "/updates",
    response_model=PaginatedResponse[WindowsUpdateResponse],
    summary="List Windows Updates",
    description="Retrieve a paginated list of tracked Windows Updates.",
)
async def list_updates(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: UpdateSeverity | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all tracked Windows Updates."""
    base_query = select(WindowsUpdate)
    count_query = select(func.count(WindowsUpdate.id))

    if severity is not None:
        base_query = base_query.where(WindowsUpdate.severity == severity)
        count_query = count_query.where(WindowsUpdate.severity == severity)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(WindowsUpdate.release_date.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/updates",
    response_model=WindowsUpdateResponse,
    status_code=201,
    summary="Register Windows Update",
    description="Register a new Windows Update (from agent or manual entry).",
)
async def create_update(
    data: WindowsUpdateCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new Windows Update."""
    # Check for duplicate KB number
    existing = await db.execute(
        select(WindowsUpdate).where(WindowsUpdate.kb_number == data.kb_number)
    )
    if existing.scalar_one_or_none() is not None:
        raise BadRequestError(f"Update with KB number '{data.kb_number}' already exists")

    update = WindowsUpdate(**data.model_dump())
    db.add(update)
    await db.flush()
    await db.refresh(update)
    return update


# ---------------------------------------------------------------------------
# Device Patch Status (bulk report from agent)
# ---------------------------------------------------------------------------

@router.post(
    "/device-status",
    response_model=DevicePatchStatusResponse,
    status_code=201,
    summary="Report device patch status",
    description="Report patch installation status for a device (from agent).",
)
async def report_device_patch_status(
    data: DevicePatchStatusCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Report/update patch status for a device."""
    # Upsert: check if status record exists
    existing_result = await db.execute(
        select(DevicePatchStatus).where(
            DevicePatchStatus.device_id == data.device_id,
            DevicePatchStatus.update_id == data.update_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        existing.status = data.status
        existing.installed_at = data.installed_at
        existing.checked_at = data.checked_at or datetime.now(UTC)
        await db.flush()
        await db.refresh(existing)
        return existing

    record = DevicePatchStatus(**data.model_dump())
    if record.checked_at is None:
        record.checked_at = datetime.now(UTC)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Compliance Summary
# ---------------------------------------------------------------------------

@router.get(
    "/compliance",
    response_model=PatchComplianceSummary,
    summary="Patch compliance summary",
    description="Aggregated patch compliance rate across all devices.",
)
async def patch_compliance(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get patch compliance summary."""
    # Total active devices
    device_count_result = await db.execute(select(func.count(Device.id)))
    total_devices = device_count_result.scalar_one()

    # Total tracked updates
    update_count_result = await db.execute(select(func.count(WindowsUpdate.id)))
    total_updates = update_count_result.scalar_one()

    if total_devices == 0 or total_updates == 0:
        return PatchComplianceSummary(
            total_devices=total_devices,
            total_updates=total_updates,
            fully_patched_devices=0,
            compliance_rate=100.0 if total_updates == 0 else 0.0,
            critical_missing=0,
            important_missing=0,
            moderate_missing=0,
            low_missing=0,
        )

    # Devices where ALL updates are installed or not_applicable
    # A device is fully patched if it has no missing patches
    missing_subq = (
        select(DevicePatchStatus.device_id)
        .where(
            DevicePatchStatus.status.in_([
                PatchStatus.not_installed,
                PatchStatus.downloading,
                PatchStatus.failed,
            ])
        )
        .distinct()
        .subquery()
    )

    fully_patched_result = await db.execute(
        select(func.count(Device.id)).where(Device.id.not_in(select(missing_subq.c.device_id)))
    )
    fully_patched = fully_patched_result.scalar_one()

    compliance_rate = round((fully_patched / total_devices) * 100, 1) if total_devices > 0 else 0.0

    # Missing counts by severity
    missing_by_severity = await db.execute(
        select(
            WindowsUpdate.severity,
            func.count(func.distinct(DevicePatchStatus.id)),
        )
        .join(WindowsUpdate, DevicePatchStatus.update_id == WindowsUpdate.id)
        .where(
            DevicePatchStatus.status.in_([
                PatchStatus.not_installed,
                PatchStatus.failed,
            ])
        )
        .group_by(WindowsUpdate.severity)
    )
    severity_counts = {row[0]: row[1] for row in missing_by_severity.all()}

    return PatchComplianceSummary(
        total_devices=total_devices,
        total_updates=total_updates,
        fully_patched_devices=fully_patched,
        compliance_rate=compliance_rate,
        critical_missing=severity_counts.get(UpdateSeverity.critical, 0),
        important_missing=severity_counts.get(UpdateSeverity.important, 0),
        moderate_missing=severity_counts.get(UpdateSeverity.moderate, 0),
        low_missing=severity_counts.get(UpdateSeverity.low, 0),
    )


# ---------------------------------------------------------------------------
# Device-specific patch status
# ---------------------------------------------------------------------------

@router.get(
    "/devices/{device_id}",
    response_model=PaginatedResponse[DevicePatchDetailResponse],
    summary="Device patch status",
    description="Get patch installation status for a specific device.",
)
async def device_patch_status(
    device_id: uuid.UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: PatchStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get patch status for a specific device."""
    # Verify device exists
    device_result = await db.execute(select(Device).where(Device.id == device_id))
    if device_result.scalar_one_or_none() is None:
        raise NotFoundError("Device", str(device_id))

    base_query = (
        select(
            DevicePatchStatus.id,
            DevicePatchStatus.device_id,
            DevicePatchStatus.update_id,
            DevicePatchStatus.status,
            DevicePatchStatus.installed_at,
            DevicePatchStatus.checked_at,
            WindowsUpdate.kb_number,
            WindowsUpdate.title.label("update_title"),
            WindowsUpdate.severity.label("update_severity"),
        )
        .join(WindowsUpdate, DevicePatchStatus.update_id == WindowsUpdate.id)
        .where(DevicePatchStatus.device_id == device_id)
    )
    count_query = (
        select(func.count(DevicePatchStatus.id))
        .where(DevicePatchStatus.device_id == device_id)
    )

    if status_filter is not None:
        base_query = base_query.where(DevicePatchStatus.status == status_filter)
        count_query = count_query.where(DevicePatchStatus.status == status_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(base_query.offset(offset).limit(limit))
    rows = result.all()

    items = [
        DevicePatchDetailResponse(
            id=row.id,
            device_id=row.device_id,
            update_id=row.update_id,
            status=row.status,
            installed_at=row.installed_at,
            checked_at=row.checked_at,
            kb_number=row.kb_number,
            update_title=row.update_title,
            update_severity=row.update_severity,
        )
        for row in rows
    ]

    return create_paginated_response(items, total, offset, limit)


# ---------------------------------------------------------------------------
# Missing Patches (cross-device)
# ---------------------------------------------------------------------------

@router.get(
    "/missing",
    response_model=list[MissingPatchEntry],
    summary="Missing patches",
    description="List updates that are not installed on one or more devices.",
)
async def missing_patches(
    severity: UpdateSeverity | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List updates missing across devices."""
    query = (
        select(
            WindowsUpdate.id.label("update_id"),
            WindowsUpdate.kb_number,
            WindowsUpdate.title,
            WindowsUpdate.severity,
            WindowsUpdate.release_date,
            func.count(DevicePatchStatus.id).label("missing_device_count"),
        )
        .join(DevicePatchStatus, DevicePatchStatus.update_id == WindowsUpdate.id)
        .where(
            DevicePatchStatus.status.in_([
                PatchStatus.not_installed,
                PatchStatus.failed,
            ])
        )
        .group_by(WindowsUpdate.id)
        .order_by(
            case(
                (WindowsUpdate.severity == UpdateSeverity.critical, 0),
                (WindowsUpdate.severity == UpdateSeverity.important, 1),
                (WindowsUpdate.severity == UpdateSeverity.moderate, 2),
                (WindowsUpdate.severity == UpdateSeverity.low, 3),
            ),
            func.count(DevicePatchStatus.id).desc(),
        )
        .limit(limit)
    )

    if severity is not None:
        query = query.having(WindowsUpdate.severity == severity)

    result = await db.execute(query)
    rows = result.all()

    return [
        MissingPatchEntry(
            update_id=row.update_id,
            kb_number=row.kb_number,
            title=row.title,
            severity=row.severity,
            release_date=row.release_date,
            missing_device_count=row.missing_device_count,
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Vulnerabilities
# ---------------------------------------------------------------------------

@router.get(
    "/vulnerabilities",
    response_model=PaginatedResponse[VulnerabilityResponse],
    summary="List vulnerabilities",
    description="Retrieve a paginated list of tracked CVE vulnerabilities.",
)
async def list_vulnerabilities(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: VulnerabilitySeverity | None = Query(None),
    is_resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List tracked vulnerabilities."""
    base_query = select(Vulnerability)
    count_query = select(func.count(Vulnerability.id))

    if severity is not None:
        base_query = base_query.where(Vulnerability.severity == severity)
        count_query = count_query.where(Vulnerability.severity == severity)

    if is_resolved is not None:
        base_query = base_query.where(Vulnerability.is_resolved == is_resolved)
        count_query = count_query.where(Vulnerability.is_resolved == is_resolved)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Vulnerability.cvss_score.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/vulnerabilities",
    response_model=VulnerabilityResponse,
    status_code=201,
    summary="Register vulnerability",
    description="Register a new CVE vulnerability.",
)
async def create_vulnerability(
    data: VulnerabilityCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new CVE vulnerability."""
    existing = await db.execute(
        select(Vulnerability).where(Vulnerability.cve_id == data.cve_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise BadRequestError(f"Vulnerability with CVE ID '{data.cve_id}' already exists")

    vuln = Vulnerability(**data.model_dump())
    db.add(vuln)
    await db.flush()
    await db.refresh(vuln)
    return vuln


@router.patch(
    "/vulnerabilities/{vuln_id}/resolve",
    response_model=VulnerabilityResponse,
    summary="Resolve vulnerability",
    description="Mark a CVE vulnerability as resolved.",
    responses={
        400: {"description": "Vulnerability already resolved"},
        404: {"description": "Vulnerability not found"},
    },
)
async def resolve_vulnerability(
    vuln_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Mark a vulnerability as resolved."""
    result = await db.execute(select(Vulnerability).where(Vulnerability.id == vuln_id))
    vuln = result.scalar_one_or_none()
    if vuln is None:
        raise NotFoundError("Vulnerability", str(vuln_id))
    if vuln.is_resolved:
        raise BadRequestError("Vulnerability is already resolved")

    vuln.is_resolved = True
    vuln.resolved_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(vuln)
    return vuln
