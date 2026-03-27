"""
Data export endpoints -- CSV/JSON streaming downloads.

Provides bulk export of devices, licenses, alerts, and audit logs
with optional date-range filtering and format selection.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.license import SoftwareLicense
from app.models.user import User, UserRole
from app.schemas.export import ExportFormat

router = APIRouter(prefix="/export", tags=["export"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _csv_streaming_response(
    rows: list[dict[str, Any]], filename: str
) -> StreamingResponse:
    """Build a StreamingResponse for CSV data."""

    def _generate():
        if not rows:
            yield ""
            return
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)
        for row in rows:
            writer.writerow(row)
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)

    return StreamingResponse(
        _generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _json_streaming_response(
    rows: list[dict[str, Any]], filename: str
) -> StreamingResponse:
    """Build a StreamingResponse for JSON data."""

    def _generate():
        yield "["
        for i, row in enumerate(rows):
            if i > 0:
                yield ","
            yield json.dumps(row, default=str, ensure_ascii=False)
        yield "]"

    return StreamingResponse(
        _generate(),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _serialize_row(obj: Any, columns: list[str]) -> dict[str, Any]:
    """Extract named columns from a SQLAlchemy model instance."""
    result = {}
    for col in columns:
        val = getattr(obj, col, None)
        if isinstance(val, datetime):
            result[col] = val.isoformat()
        elif hasattr(val, "value"):
            # Enum
            result[col] = val.value
        else:
            result[col] = val
    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/devices",
    summary="Export devices",
    description="Export all devices as CSV or JSON with optional date-range filter.",
)
async def export_devices(
    format: ExportFormat = Query(ExportFormat.csv, description="Output format"),
    date_from: datetime | None = Query(None, description="Filter by created_at >="),
    date_to: datetime | None = Query(None, description="Filter by created_at <="),
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin, UserRole.operator)
    ),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Device).order_by(Device.created_at.desc())
    if date_from:
        stmt = stmt.where(Device.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Device.created_at <= date_to)

    result = await db.execute(stmt)
    devices = result.scalars().all()

    columns = [
        "id", "hostname", "os_version", "ip_address", "mac_address",
        "domain", "status", "last_seen", "created_at",
    ]
    rows = [_serialize_row(d, columns) for d in devices]

    if format == ExportFormat.json:
        return _json_streaming_response(rows, "devices_export.json")
    return _csv_streaming_response(rows, "devices_export.csv")


@router.get(
    "/licenses",
    summary="Export licenses",
    description="Export all software licenses as CSV or JSON with optional date-range filter.",
)
async def export_licenses(
    format: ExportFormat = Query(ExportFormat.csv, description="Output format"),
    date_from: datetime | None = Query(None, description="Filter by created_at >="),
    date_to: datetime | None = Query(None, description="Filter by created_at <="),
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin, UserRole.operator)
    ),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SoftwareLicense).order_by(SoftwareLicense.created_at.desc())
    if date_from:
        stmt = stmt.where(SoftwareLicense.created_at >= date_from)
    if date_to:
        stmt = stmt.where(SoftwareLicense.created_at <= date_to)

    result = await db.execute(stmt)
    licenses = result.scalars().all()

    columns = [
        "id", "software_name", "vendor", "license_type", "license_key",
        "purchased_count", "installed_count", "m365_assigned",
        "cost_per_unit", "currency", "purchase_date", "expiry_date",
        "vendor_contract_id", "notes", "created_at", "updated_at",
    ]
    rows = [_serialize_row(lic, columns) for lic in licenses]

    if format == ExportFormat.json:
        return _json_streaming_response(rows, "licenses_export.json")
    return _csv_streaming_response(rows, "licenses_export.csv")


@router.get(
    "/alerts",
    summary="Export alerts",
    description="Export all alerts as CSV or JSON with optional date-range filter.",
)
async def export_alerts(
    format: ExportFormat = Query(ExportFormat.csv, description="Output format"),
    date_from: datetime | None = Query(None, description="Filter by created_at >="),
    date_to: datetime | None = Query(None, description="Filter by created_at <="),
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin, UserRole.operator)
    ),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Alert).order_by(Alert.created_at.desc())
    if date_from:
        stmt = stmt.where(Alert.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Alert.created_at <= date_to)

    result = await db.execute(stmt)
    alerts = result.scalars().all()

    columns = [
        "id", "device_id", "severity", "category", "title", "message",
        "is_acknowledged", "acknowledged_by", "acknowledged_at",
        "resolved_at", "created_at",
    ]
    rows = [_serialize_row(a, columns) for a in alerts]

    if format == ExportFormat.json:
        return _json_streaming_response(rows, "alerts_export.json")
    return _csv_streaming_response(rows, "alerts_export.csv")


@router.get(
    "/audit-logs",
    summary="Export audit logs",
    description="Export audit logs as CSV or JSON with optional date-range filter.",
)
async def export_audit_logs(
    format: ExportFormat = Query(ExportFormat.csv, description="Output format"),
    date_from: datetime | None = Query(None, description="Filter by created_at >="),
    date_to: datetime | None = Query(None, description="Filter by created_at <="),
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin)
    ),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    columns = [
        "id", "user_id", "action", "resource_type", "resource_id",
        "detail", "ip_address", "user_agent", "created_at",
    ]

    def _serialize_audit(obj: AuditLog) -> dict:
        row = _serialize_row(obj, columns)
        # detail is JSONB -- serialise to string for CSV
        if row.get("detail") and not isinstance(row["detail"], str):
            row["detail"] = json.dumps(row["detail"], default=str, ensure_ascii=False)
        return row

    rows = [_serialize_audit(log) for log in logs]

    if format == ExportFormat.json:
        return _json_streaming_response(rows, "audit_logs_export.json")
    return _csv_streaming_response(rows, "audit_logs_export.csv")
