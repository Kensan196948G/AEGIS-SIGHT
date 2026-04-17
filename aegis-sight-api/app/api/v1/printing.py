"""Print management API endpoints."""

import uuid
from datetime import datetime, timedelta, timezone, UTC

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.print_management import Printer, PrintJob, PrintJobStatus, PrintPolicy
from app.models.user import User
from app.schemas.print_management import (
    PrinterCreate,
    PrinterResponse,
    PrintEvaluateRequest,
    PrintEvaluateResponse,
    PrintJobCreate,
    PrintJobResponse,
    PrintPolicyCreate,
    PrintPolicyResponse,
    PrintPolicyViolation,
    PrintStatsDepartmentEntry,
    PrintStatsMonthlyEntry,
    PrintStatsPrinterEntry,
    PrintStatsResponse,
    PrintStatsUserEntry,
)

router = APIRouter(prefix="/printing", tags=["printing"])


# ---------------------------------------------------------------------------
# Printers
# ---------------------------------------------------------------------------
@router.get(
    "/printers",
    response_model=PaginatedResponse[PrinterResponse],
    summary="List printers",
    description="Retrieve a paginated list of registered printers.",
)
async def list_printers(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_active: bool | None = Query(None),
    department: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all printers with optional filters."""
    base_query = select(Printer)
    count_query = select(func.count(Printer.id))

    if is_active is not None:
        base_query = base_query.where(Printer.is_active == is_active)
        count_query = count_query.where(Printer.is_active == is_active)

    if department is not None:
        base_query = base_query.where(Printer.department == department)
        count_query = count_query.where(Printer.department == department)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(Printer.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/printers",
    response_model=PrinterResponse,
    status_code=201,
    summary="Register printer",
    description="Register a new printer.",
)
async def create_printer(
    data: PrinterCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Register a new printer."""
    printer = Printer(**data.model_dump())
    db.add(printer)
    await db.flush()
    await db.refresh(printer)
    return printer


# ---------------------------------------------------------------------------
# Print Jobs
# ---------------------------------------------------------------------------
@router.get(
    "/jobs",
    response_model=PaginatedResponse[PrintJobResponse],
    summary="List print jobs",
    description="Retrieve a paginated list of print jobs with optional filters.",
)
async def list_print_jobs(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_name: str | None = Query(None, alias="user"),
    printer_id: uuid.UUID | None = Query(None, alias="printer"),
    date_from: datetime | None = Query(None, alias="date_from"),
    date_to: datetime | None = Query(None, alias="date_to"),
    color: bool | None = Query(None),
    status: PrintJobStatus | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List print jobs with filtering."""
    base_query = select(PrintJob)
    count_query = select(func.count(PrintJob.id))

    if user_name is not None:
        base_query = base_query.where(PrintJob.user_name == user_name)
        count_query = count_query.where(PrintJob.user_name == user_name)

    if printer_id is not None:
        base_query = base_query.where(PrintJob.printer_id == printer_id)
        count_query = count_query.where(PrintJob.printer_id == printer_id)

    if date_from is not None:
        base_query = base_query.where(PrintJob.printed_at >= date_from)
        count_query = count_query.where(PrintJob.printed_at >= date_from)

    if date_to is not None:
        base_query = base_query.where(PrintJob.printed_at <= date_to)
        count_query = count_query.where(PrintJob.printed_at <= date_to)

    if color is not None:
        base_query = base_query.where(PrintJob.color == color)
        count_query = count_query.where(PrintJob.color == color)

    if status is not None:
        base_query = base_query.where(PrintJob.status == status)
        count_query = count_query.where(PrintJob.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(PrintJob.printed_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/jobs",
    response_model=PrintJobResponse,
    status_code=201,
    summary="Record print job",
    description="Record a new print job.",
)
async def create_print_job(
    data: PrintJobCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a new print job."""
    job = PrintJob(**data.model_dump())
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# Print Stats
# ---------------------------------------------------------------------------
@router.get(
    "/stats",
    response_model=PrintStatsResponse,
    summary="Print statistics",
    description="Get aggregated print statistics by user, printer, department, and monthly trend.",
)
async def print_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get aggregated print statistics."""
    # Total pages and jobs
    totals_result = await db.execute(
        select(
            func.coalesce(func.sum(PrintJob.pages * PrintJob.copies), 0).label("total_pages"),
            func.count(PrintJob.id).label("total_jobs"),
        ).where(PrintJob.status == PrintJobStatus.completed)
    )
    totals = totals_result.one()
    total_pages = int(totals.total_pages)
    total_jobs = int(totals.total_jobs)

    # Color ratio
    color_result = await db.execute(
        select(func.count(PrintJob.id)).where(
            PrintJob.status == PrintJobStatus.completed,
            PrintJob.color.is_(True),
        )
    )
    color_count = color_result.scalar_one()
    color_ratio = (color_count / total_jobs * 100) if total_jobs > 0 else 0.0

    # By user (top 10)
    by_user_result = await db.execute(
        select(
            PrintJob.user_name,
            func.sum(PrintJob.pages * PrintJob.copies).label("total_pages"),
            func.count(PrintJob.id).label("total_jobs"),
            func.sum(
                case(
                    (PrintJob.color.is_(True), PrintJob.pages * PrintJob.copies),
                    else_=0,
                )
            ).label("color_pages"),
        )
        .where(PrintJob.status == PrintJobStatus.completed)
        .group_by(PrintJob.user_name)
        .order_by(func.sum(PrintJob.pages * PrintJob.copies).desc())
        .limit(10)
    )
    by_user = [
        PrintStatsUserEntry(
            user_name=row.user_name,
            total_pages=int(row.total_pages),
            total_jobs=int(row.total_jobs),
            color_pages=int(row.color_pages),
        )
        for row in by_user_result.all()
    ]

    # By printer
    by_printer_result = await db.execute(
        select(
            PrintJob.printer_id,
            Printer.name.label("printer_name"),
            func.sum(PrintJob.pages * PrintJob.copies).label("total_pages"),
            func.count(PrintJob.id).label("total_jobs"),
        )
        .join(Printer, PrintJob.printer_id == Printer.id)
        .where(PrintJob.status == PrintJobStatus.completed)
        .group_by(PrintJob.printer_id, Printer.name)
        .order_by(func.sum(PrintJob.pages * PrintJob.copies).desc())
        .limit(10)
    )
    by_printer = [
        PrintStatsPrinterEntry(
            printer_id=row.printer_id,
            printer_name=row.printer_name,
            total_pages=int(row.total_pages),
            total_jobs=int(row.total_jobs),
        )
        for row in by_printer_result.all()
    ]

    # By department
    by_dept_result = await db.execute(
        select(
            Printer.department,
            func.sum(PrintJob.pages * PrintJob.copies).label("total_pages"),
            func.count(PrintJob.id).label("total_jobs"),
        )
        .join(Printer, PrintJob.printer_id == Printer.id)
        .where(
            PrintJob.status == PrintJobStatus.completed,
            Printer.department.isnot(None),
        )
        .group_by(Printer.department)
        .order_by(func.sum(PrintJob.pages * PrintJob.copies).desc())
    )
    by_department = [
        PrintStatsDepartmentEntry(
            department=row.department,
            total_pages=int(row.total_pages),
            total_jobs=int(row.total_jobs),
        )
        for row in by_dept_result.all()
    ]

    # Monthly trend (last 12 months)
    twelve_months_ago = datetime.now(UTC) - timedelta(days=365)
    monthly_result = await db.execute(
        select(
            func.to_char(PrintJob.printed_at, "YYYY-MM").label("month"),
            func.sum(PrintJob.pages * PrintJob.copies).label("total_pages"),
            func.count(PrintJob.id).label("total_jobs"),
            func.sum(
                case(
                    (PrintJob.color.is_(True), PrintJob.pages * PrintJob.copies),
                    else_=0,
                )
            ).label("color_pages"),
        )
        .where(
            PrintJob.status == PrintJobStatus.completed,
            PrintJob.printed_at >= twelve_months_ago,
        )
        .group_by(func.to_char(PrintJob.printed_at, "YYYY-MM"))
        .order_by(func.to_char(PrintJob.printed_at, "YYYY-MM"))
    )
    monthly_trend = [
        PrintStatsMonthlyEntry(
            month=row.month,
            total_pages=int(row.total_pages),
            total_jobs=int(row.total_jobs),
            color_pages=int(row.color_pages),
        )
        for row in monthly_result.all()
    ]

    return PrintStatsResponse(
        total_pages=total_pages,
        total_jobs=total_jobs,
        color_ratio=round(color_ratio, 1),
        by_user=by_user,
        by_printer=by_printer,
        by_department=by_department,
        monthly_trend=monthly_trend,
    )


# ---------------------------------------------------------------------------
# Print Policies
# ---------------------------------------------------------------------------
@router.get(
    "/policies",
    response_model=PaginatedResponse[PrintPolicyResponse],
    summary="List print policies",
    description="Retrieve a paginated list of print policies.",
)
async def list_print_policies(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_enabled: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all print policies."""
    base_query = select(PrintPolicy)
    count_query = select(func.count(PrintPolicy.id))

    if is_enabled is not None:
        base_query = base_query.where(PrintPolicy.is_enabled == is_enabled)
        count_query = count_query.where(PrintPolicy.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(PrintPolicy.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/policies",
    response_model=PrintPolicyResponse,
    status_code=201,
    summary="Create print policy",
    description="Create a new print policy.",
)
async def create_print_policy(
    data: PrintPolicyCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new print policy."""
    policy = PrintPolicy(**data.model_dump())
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


# ---------------------------------------------------------------------------
# Print Policy Evaluate
# ---------------------------------------------------------------------------
@router.post(
    "/evaluate",
    response_model=PrintEvaluateResponse,
    summary="Evaluate print policies",
    description="Evaluate a print job against all enabled policies before execution.",
)
async def evaluate_print_policies(
    data: PrintEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Evaluate a print job against active policies."""
    violations: list[PrintPolicyViolation] = []

    # Fetch all enabled policies
    result = await db.execute(
        select(PrintPolicy).where(PrintPolicy.is_enabled.is_(True))
    )
    policies = result.scalars().all()

    total_pages_requested = data.pages * data.copies

    for policy in policies:
        # Check department targeting
        if policy.target_departments is not None:
            if data.department is None or data.department not in policy.target_departments:
                continue

        # Check color restriction
        if not policy.allow_color and data.color:
            violations.append(
                PrintPolicyViolation(
                    policy_id=policy.id,
                    policy_name=policy.name,
                    reason="カラー印刷はこのポリシーで許可されていません",
                )
            )

        # Check duplex-only restriction
        if policy.allow_duplex_only and not data.duplex:
            violations.append(
                PrintPolicyViolation(
                    policy_id=policy.id,
                    policy_name=policy.name,
                    reason="両面印刷のみ許可されています",
                )
            )

        # Check daily page limit
        if policy.max_pages_per_day is not None:
            today_start = datetime.now(UTC).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            daily_result = await db.execute(
                select(func.coalesce(func.sum(PrintJob.pages * PrintJob.copies), 0))
                .where(
                    PrintJob.user_name == data.user_name,
                    PrintJob.status == PrintJobStatus.completed,
                    PrintJob.printed_at >= today_start,
                )
            )
            daily_pages = int(daily_result.scalar_one())
            if daily_pages + total_pages_requested > policy.max_pages_per_day:
                violations.append(
                    PrintPolicyViolation(
                        policy_id=policy.id,
                        policy_name=policy.name,
                        reason=f"1日の印刷上限({policy.max_pages_per_day}ページ)を超過します "
                        f"(本日: {daily_pages}ページ + 要求: {total_pages_requested}ページ)",
                    )
                )

        # Check monthly page limit
        if policy.max_pages_per_month is not None:
            month_start = datetime.now(UTC).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            monthly_result = await db.execute(
                select(func.coalesce(func.sum(PrintJob.pages * PrintJob.copies), 0))
                .where(
                    PrintJob.user_name == data.user_name,
                    PrintJob.status == PrintJobStatus.completed,
                    PrintJob.printed_at >= month_start,
                )
            )
            monthly_pages = int(monthly_result.scalar_one())
            if monthly_pages + total_pages_requested > policy.max_pages_per_month:
                violations.append(
                    PrintPolicyViolation(
                        policy_id=policy.id,
                        policy_name=policy.name,
                        reason=f"月間印刷上限({policy.max_pages_per_month}ページ)を超過します "
                        f"(今月: {monthly_pages}ページ + 要求: {total_pages_requested}ページ)",
                    )
                )

    return PrintEvaluateResponse(
        allowed=len(violations) == 0,
        violations=violations,
    )
