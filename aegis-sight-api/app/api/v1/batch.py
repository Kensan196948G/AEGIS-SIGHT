import csv
import io
import uuid
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import BadRequestError
from app.models.device import Device, DeviceStatus
from app.models.license import LicenseType, SoftwareLicense
from app.models.user import User
from app.schemas.batch import (
    BatchImportResponse,
    BatchJobListResponse,
    BatchJobResponse,
    BatchJobStatus,
    BatchJobType,
)

router = APIRouter(prefix="/batch", tags=["batch"])

# In-memory job history (in production, use a persistent store)
_batch_jobs: list[dict] = []


def _record_job(
    job_type: BatchJobType,
    status: BatchJobStatus,
    total_rows: int,
    success_count: int,
    error_count: int,
    user_email: str | None = None,
) -> uuid.UUID:
    """Record a batch job in the history."""
    job_id = uuid.uuid4()
    _batch_jobs.append(
        {
            "job_id": job_id,
            "job_type": job_type,
            "status": status,
            "total_rows": total_rows,
            "success_count": success_count,
            "error_count": error_count,
            "created_at": datetime.now(UTC),
            "completed_at": datetime.now(UTC),
            "created_by": user_email,
        }
    )
    return job_id


@router.post(
    "/import/devices",
    response_model=BatchImportResponse,
    summary="Import devices from CSV",
    description="Bulk import devices from a CSV file. Expected columns: hostname, os_version, ip_address, mac_address, domain, status.",
)
async def import_devices_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Import devices from CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise BadRequestError("File must be a CSV file")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise BadRequestError("File must be UTF-8 encoded") from exc

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise BadRequestError("CSV file is empty")

    required_fields = {"hostname"}
    if rows and not required_fields.issubset(set(rows[0].keys())):
        raise BadRequestError(
            f"CSV must contain columns: {', '.join(required_fields)}"
        )

    success_count = 0
    errors = []

    for i, row in enumerate(rows, start=2):  # row 1 is header
        try:
            hostname = row.get("hostname", "").strip()
            if not hostname:
                errors.append({"row": i, "error": "hostname is required"})
                continue

            # Check for duplicate
            existing = await db.execute(
                select(Device).where(Device.hostname == hostname)
            )
            if existing.scalar_one_or_none() is not None:
                errors.append(
                    {"row": i, "error": f"Device '{hostname}' already exists"}
                )
                continue

            status_val = row.get("status", "active").strip()
            try:
                device_status = DeviceStatus(status_val)
            except ValueError:
                device_status = DeviceStatus.active

            device = Device(
                hostname=hostname,
                os_version=row.get("os_version", "").strip() or None,
                ip_address=row.get("ip_address", "").strip() or None,
                mac_address=row.get("mac_address", "").strip() or None,
                domain=row.get("domain", "").strip() or None,
                status=device_status,
            )
            db.add(device)
            success_count += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    if success_count > 0:
        await db.flush()

    job_id = _record_job(
        BatchJobType.import_devices,
        BatchJobStatus.completed if not errors else BatchJobStatus.completed,
        total_rows=len(rows),
        success_count=success_count,
        error_count=len(errors),
        user_email=current_user.email,
    )

    return BatchImportResponse(
        job_id=job_id,
        job_type=BatchJobType.import_devices,
        status=BatchJobStatus.completed,
        total_rows=len(rows),
        success_count=success_count,
        error_count=len(errors),
        errors=errors[:50],  # Limit error list
        message=f"Imported {success_count} devices, {len(errors)} errors",
    )


@router.post(
    "/import/licenses",
    response_model=BatchImportResponse,
    summary="Import licenses from CSV",
    description="Bulk import software licenses from a CSV file. Expected columns: software_name, vendor, license_type, purchased_count, cost_per_unit.",
)
async def import_licenses_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Import software licenses from CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise BadRequestError("File must be a CSV file")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise BadRequestError("File must be UTF-8 encoded") from exc

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise BadRequestError("CSV file is empty")

    required_fields = {"software_name", "vendor", "license_type"}
    if rows and not required_fields.issubset(set(rows[0].keys())):
        raise BadRequestError(
            f"CSV must contain columns: {', '.join(required_fields)}"
        )

    success_count = 0
    errors = []

    for i, row in enumerate(rows, start=2):
        try:
            software_name = row.get("software_name", "").strip()
            vendor = row.get("vendor", "").strip()
            license_type_str = row.get("license_type", "").strip()

            if not software_name or not vendor:
                errors.append(
                    {"row": i, "error": "software_name and vendor are required"}
                )
                continue

            try:
                license_type = LicenseType(license_type_str)
            except ValueError:
                errors.append(
                    {
                        "row": i,
                        "error": f"Invalid license_type '{license_type_str}'",
                    }
                )
                continue

            from decimal import Decimal, InvalidOperation

            cost_str = row.get("cost_per_unit", "").strip()
            cost_per_unit = None
            if cost_str:
                try:
                    cost_per_unit = Decimal(cost_str)
                except InvalidOperation:
                    errors.append(
                        {"row": i, "error": f"Invalid cost_per_unit '{cost_str}'"}
                    )
                    continue

            purchased_str = row.get("purchased_count", "0").strip()
            try:
                purchased_count = int(purchased_str) if purchased_str else 0
            except ValueError:
                purchased_count = 0

            lic = SoftwareLicense(
                software_name=software_name,
                vendor=vendor,
                license_type=license_type,
                license_key=row.get("license_key", "").strip() or None,
                purchased_count=purchased_count,
                installed_count=int(row.get("installed_count", "0").strip() or "0"),
                cost_per_unit=cost_per_unit,
                currency=row.get("currency", "JPY").strip() or "JPY",
                notes=row.get("notes", "").strip() or None,
            )
            db.add(lic)
            success_count += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    if success_count > 0:
        await db.flush()

    job_id = _record_job(
        BatchJobType.import_licenses,
        BatchJobStatus.completed,
        total_rows=len(rows),
        success_count=success_count,
        error_count=len(errors),
        user_email=current_user.email,
    )

    return BatchImportResponse(
        job_id=job_id,
        job_type=BatchJobType.import_licenses,
        status=BatchJobStatus.completed,
        total_rows=len(rows),
        success_count=success_count,
        error_count=len(errors),
        errors=errors[:50],
        message=f"Imported {success_count} licenses, {len(errors)} errors",
    )


@router.get(
    "/export/devices",
    summary="Export devices to CSV",
    description="Export all devices as a CSV file download.",
)
async def export_devices_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Export all devices as CSV."""
    result = await db.execute(
        select(Device).order_by(Device.hostname)
    )
    devices = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["id", "hostname", "os_version", "ip_address", "mac_address", "domain", "status", "last_seen", "created_at"]
    )
    for d in devices:
        writer.writerow([
            str(d.id),
            d.hostname,
            d.os_version or "",
            d.ip_address or "",
            d.mac_address or "",
            d.domain or "",
            d.status.value if d.status else "",
            str(d.last_seen) if d.last_seen else "",
            str(d.created_at),
        ])

    _record_job(
        BatchJobType.export_devices,
        BatchJobStatus.completed,
        total_rows=len(devices),
        success_count=len(devices),
        error_count=0,
        user_email=current_user.email,
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=devices_export.csv"
        },
    )


@router.get(
    "/export/licenses",
    summary="Export licenses to CSV",
    description="Export all software licenses as a CSV file download.",
)
async def export_licenses_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Export all software licenses as CSV."""
    result = await db.execute(
        select(SoftwareLicense).order_by(SoftwareLicense.software_name)
    )
    licenses = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "software_name", "vendor", "license_type", "license_key",
        "purchased_count", "installed_count", "cost_per_unit", "currency",
        "purchase_date", "expiry_date", "notes", "created_at",
    ])
    for lic in licenses:
        writer.writerow([
            str(lic.id),
            lic.software_name,
            lic.vendor,
            lic.license_type.value if lic.license_type else "",
            lic.license_key or "",
            lic.purchased_count,
            lic.installed_count,
            str(lic.cost_per_unit) if lic.cost_per_unit else "",
            lic.currency,
            str(lic.purchase_date) if lic.purchase_date else "",
            str(lic.expiry_date) if lic.expiry_date else "",
            lic.notes or "",
            str(lic.created_at),
        ])

    _record_job(
        BatchJobType.export_licenses,
        BatchJobStatus.completed,
        total_rows=len(licenses),
        success_count=len(licenses),
        error_count=0,
        user_email=current_user.email,
    )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=licenses_export.csv"
        },
    )


@router.get(
    "/jobs",
    response_model=BatchJobListResponse,
    summary="List batch jobs",
    description="Retrieve batch job history.",
)
async def list_batch_jobs(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _current_user: User = Depends(get_current_active_user),
):
    """List batch job history."""
    sorted_jobs = sorted(
        _batch_jobs, key=lambda j: j["created_at"], reverse=True
    )
    page = sorted_jobs[offset : offset + limit]
    return BatchJobListResponse(
        jobs=[BatchJobResponse(**j) for j in page],
        total=len(_batch_jobs),
    )
