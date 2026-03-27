"""Audit log API endpoints -- read-only access for auditors."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.audit_log import AuditAction
from app.models.user import User, UserRole
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "/logs",
    response_model=PaginatedResponse[AuditLogResponse],
    summary="List audit logs",
    description="Retrieve audit logs with optional filtering. Requires auditor or admin role.",
)
async def list_audit_logs(
    action: AuditAction | None = Query(None, description="Filter by action type"),
    user_id: uuid.UUID | None = Query(None, description="Filter by user ID"),
    resource_type: str | None = Query(None, description="Filter by resource type"),
    date_from: datetime | None = Query(None, description="Filter from date (inclusive)"),
    date_to: datetime | None = Query(None, description="Filter to date (inclusive)"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _current_user: User = Depends(require_role(UserRole.auditor, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    items, total = await service.query_logs(
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )
    return create_paginated_response(items=items, total=total, offset=offset, limit=limit)


@router.get(
    "/logs/export",
    summary="Export audit logs",
    description="Export audit logs as CSV or JSON. Requires auditor or admin role.",
)
async def export_audit_logs(
    format: str = Query("csv", regex="^(csv|json)$", description="Export format: csv or json"),
    action: AuditAction | None = Query(None),
    user_id: uuid.UUID | None = Query(None),
    resource_type: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    _current_user: User = Depends(require_role(UserRole.auditor, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    service = AuditService(db)
    # Export up to 10,000 records
    items, _total = await service.query_logs(
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        date_from=date_from,
        date_to=date_to,
        offset=0,
        limit=10_000,
    )

    if format == "json":
        import json

        rows = [
            AuditLogResponse.model_validate(item).model_dump(mode="json")
            for item in items
        ]
        content = json.dumps(rows, ensure_ascii=False, indent=2)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=audit_logs.json"},
        )

    # CSV export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "user_id", "action", "resource_type", "resource_id",
        "detail", "ip_address", "user_agent", "created_at",
    ])
    for item in items:
        writer.writerow([
            str(item.id),
            str(item.user_id) if item.user_id else "",
            item.action.value,
            item.resource_type,
            item.resource_id or "",
            str(item.detail) if item.detail else "",
            item.ip_address or "",
            item.user_agent or "",
            item.created_at.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )
