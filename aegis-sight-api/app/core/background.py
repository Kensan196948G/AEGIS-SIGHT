"""
Background task manager for AEGIS-SIGHT API.

Wraps FastAPI's ``BackgroundTasks`` to provide fire-and-forget helpers
for audit logging and notification delivery.

Usage::

    from app.core.background import BackgroundTaskManager

    @router.post("/devices")
    async def create_device(
        ...,
        background_tasks: BackgroundTasks,
        db: AsyncSession = Depends(get_db),
    ):
        device = ...
        mgr = BackgroundTaskManager(background_tasks)
        mgr.enqueue_audit_log(
            db=db,
            action=AuditAction.create,
            resource_type="device",
            resource_id=str(device.id),
            user_id=current_user.id,
            detail={"hostname": device.hostname},
            ip_address=request.client.host,
        )
        mgr.enqueue_notification(
            NotificationService.notify_security_alert,
            alert={"title": "New device registered", "severity": "low"},
        )
        return device
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Callable, Coroutine

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    """
    Convenience wrapper around FastAPI ``BackgroundTasks``.

    All enqueued work is executed **after** the response is sent to the client,
    so failures do not affect the HTTP status code.
    """

    def __init__(self, background_tasks: BackgroundTasks) -> None:
        self._bg = background_tasks

    # ------------------------------------------------------------------
    # Audit logging
    # ------------------------------------------------------------------
    def enqueue_audit_log(
        self,
        *,
        db: AsyncSession,
        action: AuditAction,
        resource_type: str,
        resource_id: str | None = None,
        user_id: uuid.UUID | None = None,
        detail: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """Schedule an audit log entry to be written in the background."""

        async def _write() -> None:
            try:
                from app.services.audit_service import AuditService

                svc = AuditService(db)
                await svc.log_action(
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    user_id=user_id,
                    detail=detail,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                await db.commit()
            except Exception:
                logger.exception(
                    "Background audit log failed: action=%s resource=%s/%s",
                    action,
                    resource_type,
                    resource_id,
                )

        self._bg.add_task(_write)

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------
    def enqueue_notification(
        self,
        coro_func: Callable[..., Coroutine[Any, Any, Any]],
        **kwargs: Any,
    ) -> None:
        """
        Schedule an async notification function in the background.

        Parameters
        ----------
        coro_func :
            An async callable (e.g. ``NotificationService.send_email``).
        **kwargs :
            Keyword arguments forwarded to *coro_func*.
        """

        async def _send() -> None:
            try:
                await coro_func(**kwargs)
            except Exception:
                logger.exception(
                    "Background notification failed: func=%s", coro_func.__name__
                )

        self._bg.add_task(_send)

    # ------------------------------------------------------------------
    # Generic
    # ------------------------------------------------------------------
    def enqueue(
        self,
        coro_func: Callable[..., Coroutine[Any, Any, Any]],
        *args: Any,
        **kwargs: Any,
    ) -> None:
        """Enqueue an arbitrary async function."""

        async def _run() -> None:
            try:
                await coro_func(*args, **kwargs)
            except Exception:
                logger.exception(
                    "Background task failed: func=%s", coro_func.__name__
                )

        self._bg.add_task(_run)
