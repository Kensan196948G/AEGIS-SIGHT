"""Log management API endpoints."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.log_event import FileEvent, LogonEvent, UsbEvent
from app.models.user import User
from app.schemas.log_event import (
    FileEventResponse,
    LogonEventResponse,
    LogSummaryResponse,
    UsbEventResponse,
)

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get(
    "/logon",
    response_model=PaginatedResponse[LogonEventResponse],
    summary="List logon events",
    description="Retrieve a paginated list of Windows logon/logoff events with optional filters.",
)
async def list_logon_events(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    device_id: uuid.UUID | None = Query(None, description="Filter by device ID"),
    user_name: str | None = Query(None, description="Filter by user name"),
    date_from: datetime | None = Query(None, description="Start of date range (inclusive)"),
    date_to: datetime | None = Query(None, description="End of date range (inclusive)"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List logon events with pagination and filters."""
    base_query = select(LogonEvent)
    count_query = select(func.count(LogonEvent.id))

    if device_id:
        base_query = base_query.where(LogonEvent.device_id == device_id)
        count_query = count_query.where(LogonEvent.device_id == device_id)
    if user_name:
        base_query = base_query.where(LogonEvent.user_name.ilike(f"%{user_name}%"))
        count_query = count_query.where(LogonEvent.user_name.ilike(f"%{user_name}%"))
    if date_from:
        base_query = base_query.where(LogonEvent.occurred_at >= date_from)
        count_query = count_query.where(LogonEvent.occurred_at >= date_from)
    if date_to:
        base_query = base_query.where(LogonEvent.occurred_at <= date_to)
        count_query = count_query.where(LogonEvent.occurred_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(LogonEvent.occurred_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/usb",
    response_model=PaginatedResponse[UsbEventResponse],
    summary="List USB events",
    description="Retrieve a paginated list of USB connect/disconnect events.",
)
async def list_usb_events(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    device_id: uuid.UUID | None = Query(None, description="Filter by device ID"),
    date_from: datetime | None = Query(None, description="Start of date range (inclusive)"),
    date_to: datetime | None = Query(None, description="End of date range (inclusive)"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List USB events with pagination and filters."""
    base_query = select(UsbEvent)
    count_query = select(func.count(UsbEvent.id))

    if device_id:
        base_query = base_query.where(UsbEvent.device_id == device_id)
        count_query = count_query.where(UsbEvent.device_id == device_id)
    if date_from:
        base_query = base_query.where(UsbEvent.occurred_at >= date_from)
        count_query = count_query.where(UsbEvent.occurred_at >= date_from)
    if date_to:
        base_query = base_query.where(UsbEvent.occurred_at <= date_to)
        count_query = count_query.where(UsbEvent.occurred_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(UsbEvent.occurred_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/files",
    response_model=PaginatedResponse[FileEventResponse],
    summary="List file events",
    description="Retrieve a paginated list of file operation events.",
)
async def list_file_events(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    device_id: uuid.UUID | None = Query(None, description="Filter by device ID"),
    user_name: str | None = Query(None, description="Filter by user name"),
    date_from: datetime | None = Query(None, description="Start of date range (inclusive)"),
    date_to: datetime | None = Query(None, description="End of date range (inclusive)"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List file events with pagination and filters."""
    base_query = select(FileEvent)
    count_query = select(func.count(FileEvent.id))

    if device_id:
        base_query = base_query.where(FileEvent.device_id == device_id)
        count_query = count_query.where(FileEvent.device_id == device_id)
    if user_name:
        base_query = base_query.where(FileEvent.user_name.ilike(f"%{user_name}%"))
        count_query = count_query.where(FileEvent.user_name.ilike(f"%{user_name}%"))
    if date_from:
        base_query = base_query.where(FileEvent.occurred_at >= date_from)
        count_query = count_query.where(FileEvent.occurred_at >= date_from)
    if date_to:
        base_query = base_query.where(FileEvent.occurred_at <= date_to)
        count_query = count_query.where(FileEvent.occurred_at <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(FileEvent.occurred_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.get(
    "/summary",
    response_model=LogSummaryResponse,
    summary="Log statistics summary",
    description="Get aggregate counts across all log event types.",
)
async def log_summary(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return aggregate log statistics."""
    logon_count = (await db.execute(select(func.count(LogonEvent.id)))).scalar_one()
    usb_count = (await db.execute(select(func.count(UsbEvent.id)))).scalar_one()
    file_count = (await db.execute(select(func.count(FileEvent.id)))).scalar_one()

    unique_users_result = await db.execute(
        select(func.count(func.distinct(LogonEvent.user_name)))
    )
    unique_users = unique_users_result.scalar_one()

    unique_devices_result = await db.execute(
        select(func.count(func.distinct(LogonEvent.device_id)))
    )
    unique_devices = unique_devices_result.scalar_one()

    return LogSummaryResponse(
        total_logon_events=logon_count,
        total_usb_events=usb_count,
        total_file_events=file_count,
        unique_users=unique_users,
        unique_devices=unique_devices,
    )
