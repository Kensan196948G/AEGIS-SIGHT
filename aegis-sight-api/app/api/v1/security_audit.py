"""Security audit API endpoints (admin only).

Provides visibility into failed logins, active sessions, and the ability
to forcefully revoke sessions.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.core.exceptions import NotFoundError
from app.core.session_manager import SessionManager
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole

router = APIRouter(
    prefix="/security/audit",
    tags=["security-audit"],
    dependencies=[Depends(require_role(UserRole.admin))],
)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class FailedLoginEntry(BaseModel):
    id: str
    user_id: str | None
    ip_address: str | None
    user_agent: str | None
    detail: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class FailedLoginResponse(BaseModel):
    items: list[FailedLoginEntry]
    total: int


class SessionEntry(BaseModel):
    session_id: str
    user_id: str
    created_at: str
    last_activity: str
    ip_address: str
    user_agent: str


class ActiveSessionsResponse(BaseModel):
    items: list[SessionEntry]
    total: int


class RevokeSessionResponse(BaseModel):
    message: str
    session_id: str


# ---------------------------------------------------------------------------
# Shared session manager instance
# ---------------------------------------------------------------------------

_session_manager: SessionManager | None = None


def get_session_manager() -> SessionManager:
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/failed-logins", response_model=FailedLoginResponse)
async def list_failed_logins(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.admin)),
) -> FailedLoginResponse:
    """Return a paginated list of failed login attempts from the audit log."""

    stmt = select(AuditLog).where(
        AuditLog.action == "login_failed",
    )
    count_stmt = select(func.count()).select_from(AuditLog).where(
        AuditLog.action == "login_failed",
    )

    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
        count_stmt = count_stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
        count_stmt = count_stmt.where(AuditLog.created_at <= date_to)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    items = [
        FailedLoginEntry(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            detail=log.detail,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return FailedLoginResponse(items=items, total=total)


@router.get("/active-sessions", response_model=ActiveSessionsResponse)
async def list_active_sessions(
    _user: User = Depends(require_role(UserRole.admin)),
) -> ActiveSessionsResponse:
    """Return all active sessions across the system."""
    sm = get_session_manager()
    sessions = await sm.list_all_sessions()
    items = [
        SessionEntry(
            session_id=s.session_id,
            user_id=s.user_id,
            created_at=s.created_at,
            last_activity=s.last_activity,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
        )
        for s in sessions
    ]
    return ActiveSessionsResponse(items=items, total=len(items))


@router.post(
    "/revoke-session/{session_id}",
    response_model=RevokeSessionResponse,
)
async def revoke_session(
    session_id: str,
    _user: User = Depends(require_role(UserRole.admin)),
) -> RevokeSessionResponse:
    """Forcefully revoke (invalidate) a session by ID."""
    sm = get_session_manager()
    revoked = await sm.invalidate_session(session_id)
    if not revoked:
        raise NotFoundError(resource="Session", resource_id=session_id)
    return RevokeSessionResponse(
        message="Session revoked successfully",
        session_id=session_id,
    )
