"""Report generation endpoints -- CSV streaming downloads."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/sam",
    summary="SAM compliance report",
    description="Generate a Software Asset Management report (J-SOX). Returns CSV.",
)
async def sam_report(
    date_from: datetime | None = Query(None, description="Filter licences created from"),
    date_to: datetime | None = Query(None, description="Filter licences created until"),
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin)
    ),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    csv_content = await service.generate_sam_report(
        date_from=date_from, date_to=date_to
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sam_report.csv"},
    )


@router.get(
    "/assets",
    summary="Asset inventory report",
    description="Generate a device asset inventory report. Returns CSV.",
)
async def asset_report(
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin)
    ),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    csv_content = await service.generate_asset_report()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=asset_report.csv"},
    )


@router.get(
    "/security",
    summary="Security status report",
    description="Generate a security compliance report across devices. Returns CSV.",
)
async def security_report(
    _current_user: User = Depends(
        require_role(UserRole.auditor, UserRole.admin)
    ),
    db: AsyncSession = Depends(get_db),
):
    service = ReportService(db)
    csv_content = await service.generate_security_report()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=security_report.csv"},
    )
