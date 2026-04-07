import csv
import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.sla import (
    SLADefinition,
    SLAMeasurement,
    SLAMetricType,
    SLAViolation,
    ViolationSeverity,
)
from app.models.user import User
from app.schemas.sla import (
    SLADashboard,
    SLADashboardItem,
    SLADefinitionCreate,
    SLADefinitionResponse,
    SLADefinitionUpdate,
    SLAMeasurementCreate,
    SLAMeasurementResponse,
    SLAReportRow,
    SLAViolationResponse,
)

router = APIRouter(prefix="/sla", tags=["sla"])


# ---------------------------------------------------------------------------
# SLA Definitions
# ---------------------------------------------------------------------------
@router.get(
    "/definitions",
    response_model=PaginatedResponse[SLADefinitionResponse],
    summary="List SLA definitions",
    description="Retrieve a paginated list of SLA definitions.",
)
async def list_definitions(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    metric_type: SLAMetricType | None = Query(None, description="Filter by metric type"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all SLA definitions with pagination and optional filters."""
    base_query = select(SLADefinition)
    count_query = select(func.count(SLADefinition.id))

    if metric_type is not None:
        base_query = base_query.where(SLADefinition.metric_type == metric_type)
        count_query = count_query.where(SLADefinition.metric_type == metric_type)

    if is_active is not None:
        base_query = base_query.where(SLADefinition.is_active == is_active)
        count_query = count_query.where(SLADefinition.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(SLADefinition.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/definitions",
    response_model=SLADefinitionResponse,
    status_code=201,
    summary="Create SLA definition",
    description="Create a new SLA definition.",
)
async def create_definition(
    data: SLADefinitionCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Create a new SLA definition."""
    definition = SLADefinition(
        name=data.name,
        description=data.description,
        metric_type=data.metric_type,
        target_value=data.target_value,
        unit=data.unit,
        measurement_period=data.measurement_period,
        warning_threshold=data.warning_threshold,
        is_active=data.is_active,
    )
    db.add(definition)
    await db.flush()
    await db.refresh(definition)
    return definition


@router.patch(
    "/definitions/{definition_id}",
    response_model=SLADefinitionResponse,
    summary="Update SLA definition",
    description="Update an existing SLA definition.",
    responses={404: {"description": "SLA definition not found"}},
)
async def update_definition(
    definition_id: uuid.UUID,
    data: SLADefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Update an SLA definition's fields."""
    result = await db.execute(
        select(SLADefinition).where(SLADefinition.id == definition_id)
    )
    definition = result.scalar_one_or_none()
    if definition is None:
        raise NotFoundError("SLADefinition", str(definition_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(definition, field, value)

    await db.flush()
    await db.refresh(definition)
    return definition


# ---------------------------------------------------------------------------
# SLA Measurements
# ---------------------------------------------------------------------------
@router.get(
    "/measurements",
    response_model=PaginatedResponse[SLAMeasurementResponse],
    summary="List SLA measurements",
    description="Retrieve a paginated list of SLA measurements with optional filters.",
)
async def list_measurements(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    sla_id: uuid.UUID | None = Query(None, description="Filter by SLA definition"),
    is_met: bool | None = Query(None, description="Filter by met status"),
    period_start: date | None = Query(None, description="Filter by period start (>=)"),
    period_end: date | None = Query(None, description="Filter by period end (<=)"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all SLA measurements with pagination and optional filters."""
    base_query = select(SLAMeasurement)
    count_query = select(func.count(SLAMeasurement.id))

    if sla_id is not None:
        base_query = base_query.where(SLAMeasurement.sla_id == sla_id)
        count_query = count_query.where(SLAMeasurement.sla_id == sla_id)

    if is_met is not None:
        base_query = base_query.where(SLAMeasurement.is_met == is_met)
        count_query = count_query.where(SLAMeasurement.is_met == is_met)

    if period_start is not None:
        base_query = base_query.where(SLAMeasurement.period_start >= period_start)
        count_query = count_query.where(SLAMeasurement.period_start >= period_start)

    if period_end is not None:
        base_query = base_query.where(SLAMeasurement.period_end <= period_end)
        count_query = count_query.where(SLAMeasurement.period_end <= period_end)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(SLAMeasurement.measured_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/measurements",
    response_model=SLAMeasurementResponse,
    status_code=201,
    summary="Record SLA measurement",
    description="Record a new SLA measurement. Automatically creates a violation if the SLA is not met.",
)
async def create_measurement(
    data: SLAMeasurementCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Record a new SLA measurement and auto-create violation if not met."""
    # Verify SLA definition exists
    sla_result = await db.execute(
        select(SLADefinition).where(SLADefinition.id == data.sla_id)
    )
    sla_def = sla_result.scalar_one_or_none()
    if sla_def is None:
        raise NotFoundError("SLADefinition", str(data.sla_id))

    measurement = SLAMeasurement(
        sla_id=data.sla_id,
        measured_value=data.measured_value,
        target_value=data.target_value,
        is_met=data.is_met,
        period_start=data.period_start,
        period_end=data.period_end,
        detail=data.detail,
    )
    db.add(measurement)
    await db.flush()
    await db.refresh(measurement)

    # Auto-create violation if not met
    if not data.is_met:
        severity = ViolationSeverity.breach
        if data.measured_value >= sla_def.warning_threshold:
            severity = ViolationSeverity.warning

        violation = SLAViolation(
            sla_id=data.sla_id,
            measurement_id=measurement.id,
            violation_detail=(
                f"SLA '{sla_def.name}' not met: measured {data.measured_value} "
                f"vs target {data.target_value} ({sla_def.unit})"
            ),
            severity=severity,
        )
        db.add(violation)
        await db.flush()

    return measurement


# ---------------------------------------------------------------------------
# SLA Violations
# ---------------------------------------------------------------------------
@router.get(
    "/violations",
    response_model=PaginatedResponse[SLAViolationResponse],
    summary="List SLA violations",
    description="Retrieve a paginated list of SLA violations.",
)
async def list_violations(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    sla_id: uuid.UUID | None = Query(None, description="Filter by SLA definition"),
    severity: ViolationSeverity | None = Query(None, description="Filter by severity"),
    notified: bool | None = Query(None, description="Filter by notified status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all SLA violations with pagination and optional filters."""
    base_query = select(SLAViolation)
    count_query = select(func.count(SLAViolation.id))

    if sla_id is not None:
        base_query = base_query.where(SLAViolation.sla_id == sla_id)
        count_query = count_query.where(SLAViolation.sla_id == sla_id)

    if severity is not None:
        base_query = base_query.where(SLAViolation.severity == severity)
        count_query = count_query.where(SLAViolation.severity == severity)

    if notified is not None:
        base_query = base_query.where(SLAViolation.notified == notified)
        count_query = count_query.where(SLAViolation.notified == notified)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(SLAViolation.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get(
    "/dashboard",
    response_model=SLADashboard,
    summary="SLA dashboard",
    description="Get an aggregated SLA dashboard with achievement rates per SLA.",
)
async def sla_dashboard(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Get SLA dashboard with achievement rate summary for all active SLAs."""
    # Get all active definitions
    defs_result = await db.execute(
        select(SLADefinition).where(SLADefinition.is_active.is_(True))
    )
    definitions = defs_result.scalars().all()

    total_defs_result = await db.execute(select(func.count(SLADefinition.id)))
    total_definitions = total_defs_result.scalar_one()

    total_violations_result = await db.execute(select(func.count(SLAViolation.id)))
    total_violations = total_violations_result.scalar_one()

    items: list[SLADashboardItem] = []
    overall_met = 0
    overall_total = 0

    for defn in definitions:
        # Total measurements for this SLA
        total_m_result = await db.execute(
            select(func.count(SLAMeasurement.id)).where(
                SLAMeasurement.sla_id == defn.id
            )
        )
        total_measurements = total_m_result.scalar_one()

        # Met count
        met_result = await db.execute(
            select(func.count(SLAMeasurement.id)).where(
                SLAMeasurement.sla_id == defn.id,
                SLAMeasurement.is_met.is_(True),
            )
        )
        met_count = met_result.scalar_one()

        # Violation count
        viol_result = await db.execute(
            select(func.count(SLAViolation.id)).where(
                SLAViolation.sla_id == defn.id
            )
        )
        violation_count = viol_result.scalar_one()

        # Latest measurement
        latest_result = await db.execute(
            select(SLAMeasurement)
            .where(SLAMeasurement.sla_id == defn.id)
            .order_by(SLAMeasurement.measured_at.desc())
            .limit(1)
        )
        latest = latest_result.scalar_one_or_none()

        achievement_rate = (
            round(met_count / total_measurements * 100, 2)
            if total_measurements > 0
            else None
        )

        overall_met += met_count
        overall_total += total_measurements

        items.append(
            SLADashboardItem(
                sla_id=defn.id,
                name=defn.name,
                metric_type=defn.metric_type,
                target_value=defn.target_value,
                current_value=latest.measured_value if latest else None,
                achievement_rate=achievement_rate,
                is_met=latest.is_met if latest else None,
                measurement_period=defn.measurement_period,
                total_measurements=total_measurements,
                met_count=met_count,
                violation_count=violation_count,
            )
        )

    overall_achievement_rate = (
        round(overall_met / overall_total * 100, 2)
        if overall_total > 0
        else None
    )

    return SLADashboard(
        overall_achievement_rate=overall_achievement_rate,
        total_definitions=total_definitions,
        active_definitions=len(definitions),
        total_violations=total_violations,
        items=items,
    )


# ---------------------------------------------------------------------------
# Report (CSV export)
# ---------------------------------------------------------------------------
@router.get(
    "/report",
    summary="SLA report",
    description=(
        "Generate a monthly SLA report. Returns JSON by default, "
        "or CSV when format=csv is specified."
    ),
)
async def sla_report(
    month: int = Query(..., ge=1, le=12, description="Report month (1-12)"),
    year: int = Query(..., ge=2000, le=2100, description="Report year"),
    format: str = Query("json", description="Output format: json or csv"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Generate a monthly SLA report with optional CSV export."""
    from datetime import date as date_cls

    period_start = date_cls(year, month, 1)
    if month == 12:
        period_end = date_cls(year + 1, 1, 1)
    else:
        period_end = date_cls(year, month + 1, 1)

    result = await db.execute(
        select(SLAMeasurement, SLADefinition)
        .join(SLADefinition, SLAMeasurement.sla_id == SLADefinition.id)
        .where(
            SLAMeasurement.period_start >= period_start,
            SLAMeasurement.period_end < period_end,
        )
        .order_by(SLADefinition.name, SLAMeasurement.period_start)
    )
    rows = result.all()

    report_rows = [
        SLAReportRow(
            sla_name=defn.name,
            metric_type=defn.metric_type.value,
            target_value=defn.target_value,
            unit=defn.unit,
            measured_value=meas.measured_value,
            is_met=meas.is_met,
            period_start=meas.period_start,
            period_end=meas.period_end,
            measured_at=meas.measured_at,
        )
        for meas, defn in rows
    ]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "SLA Name", "Metric Type", "Target Value", "Unit",
            "Measured Value", "Is Met", "Period Start", "Period End", "Measured At",
        ])
        for row in report_rows:
            writer.writerow([
                row.sla_name,
                row.metric_type,
                str(row.target_value),
                row.unit,
                str(row.measured_value),
                str(row.is_met),
                str(row.period_start),
                str(row.period_end),
                row.measured_at.isoformat(),
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=sla_report_{year}_{month:02d}.csv"
            },
        )

    return {"month": month, "year": year, "total": len(report_rows), "rows": report_rows}
