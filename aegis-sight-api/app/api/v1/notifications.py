"""
Notification channel and rule management API.

Provides CRUD operations for notification channels (email, webhook, Slack, Teams)
and notification rules (event-to-channel mappings).
"""

import logging
import uuid
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import NotFoundError
from app.core.pagination import PaginatedResponse, create_paginated_response
from app.models.notification_channel import (
    ChannelType,
    NotificationChannel,
    NotificationEventType,
    NotificationRule,
)
from app.models.user import User, UserRole
from app.schemas.notification_channel import (
    NotificationChannelCreate,
    NotificationChannelResponse,
    NotificationChannelTestResult,
    NotificationChannelUpdate,
    NotificationRuleCreate,
    NotificationRuleResponse,
    NotificationRuleUpdate,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# Channel endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/channels",
    response_model=PaginatedResponse[NotificationChannelResponse],
    summary="List notification channels",
    description="Retrieve a paginated list of notification channels.",
)
async def list_channels(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    channel_type: ChannelType | None = Query(None, description="Filter by channel type"),
    is_enabled: bool | None = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all notification channels with pagination."""
    base_query = select(NotificationChannel)
    count_query = select(func.count(NotificationChannel.id))

    if channel_type is not None:
        base_query = base_query.where(NotificationChannel.channel_type == channel_type)
        count_query = count_query.where(NotificationChannel.channel_type == channel_type)

    if is_enabled is not None:
        base_query = base_query.where(NotificationChannel.is_enabled == is_enabled)
        count_query = count_query.where(NotificationChannel.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(NotificationChannel.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/channels",
    response_model=NotificationChannelResponse,
    status_code=201,
    summary="Create notification channel",
    description="Create a new notification channel.",
)
async def create_channel(
    data: NotificationChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
):
    """Create a new notification channel."""
    channel = NotificationChannel(
        name=data.name,
        channel_type=data.channel_type,
        config=data.config,
        is_enabled=data.is_enabled,
        created_by=current_user.id,
    )
    db.add(channel)
    await db.flush()
    await db.refresh(channel)
    return channel


@router.patch(
    "/channels/{channel_id}",
    response_model=NotificationChannelResponse,
    summary="Update notification channel",
    description="Update an existing notification channel.",
    responses={404: {"description": "Channel not found"}},
)
async def update_channel(
    channel_id: uuid.UUID,
    data: NotificationChannelUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
):
    """Update a notification channel."""
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if channel is None:
        raise NotFoundError("NotificationChannel", str(channel_id))

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(channel, field, value)

    channel.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(channel)
    return channel


@router.delete(
    "/channels/{channel_id}",
    status_code=204,
    summary="Delete notification channel",
    description="Delete a notification channel and its associated rules.",
    responses={404: {"description": "Channel not found"}},
)
async def delete_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin)),
):
    """Delete a notification channel."""
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if channel is None:
        raise NotFoundError("NotificationChannel", str(channel_id))

    await db.delete(channel)
    await db.flush()


@router.post(
    "/channels/{channel_id}/test",
    response_model=NotificationChannelTestResult,
    summary="Test notification channel",
    description="Send a test notification through the specified channel.",
    responses={404: {"description": "Channel not found"}},
)
async def test_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
):
    """Send a test notification to verify channel configuration."""
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if channel is None:
        raise NotFoundError("NotificationChannel", str(channel_id))

    if not channel.is_enabled:
        return NotificationChannelTestResult(
            success=False,
            message="Channel is disabled. Enable it before testing.",
        )

    success = False
    message = "Unknown channel type."

    try:
        if channel.channel_type == ChannelType.email:
            to_email = channel.config.get("to_email") or channel.config.get("email")
            if not to_email:
                return NotificationChannelTestResult(
                    success=False,
                    message="No recipient email configured in channel config.",
                )
            success = await NotificationService.send_email(
                to=to_email,
                subject="[AEGIS-SIGHT] Test Notification",
                body="This is a test notification from AEGIS-SIGHT.",
            )
            message = "Test email sent successfully." if success else "Failed to send test email."

        elif channel.channel_type == ChannelType.webhook:
            webhook_url = channel.config.get("url")
            if not webhook_url:
                return NotificationChannelTestResult(
                    success=False,
                    message="No webhook URL configured in channel config.",
                )
            success = await NotificationService.send_webhook(
                url=webhook_url,
                payload={"type": "test", "message": "AEGIS-SIGHT test notification"},
            )
            message = "Test webhook sent successfully." if success else "Failed to send test webhook."

        elif channel.channel_type == ChannelType.slack:
            webhook_url = channel.config.get("webhook_url")
            if not webhook_url:
                return NotificationChannelTestResult(
                    success=False,
                    message="No Slack webhook URL configured in channel config.",
                )
            success = await NotificationService.send_webhook(
                url=webhook_url,
                payload={"text": "[AEGIS-SIGHT] Test notification"},
            )
            message = "Test Slack message sent successfully." if success else "Failed to send Slack message."

        elif channel.channel_type == ChannelType.teams:
            webhook_url = channel.config.get("webhook_url")
            if not webhook_url:
                return NotificationChannelTestResult(
                    success=False,
                    message="No Teams webhook URL configured in channel config.",
                )
            success = await NotificationService.send_webhook(
                url=webhook_url,
                payload={
                    "@type": "MessageCard",
                    "summary": "AEGIS-SIGHT Test",
                    "text": "[AEGIS-SIGHT] Test notification",
                },
            )
            message = "Test Teams message sent successfully." if success else "Failed to send Teams message."

    except Exception as exc:
        logger.exception("Test notification failed for channel %s", channel_id)
        message = f"Test failed: {exc}"

    return NotificationChannelTestResult(success=success, message=message)


# ---------------------------------------------------------------------------
# Rule endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/rules",
    response_model=PaginatedResponse[NotificationRuleResponse],
    summary="List notification rules",
    description="Retrieve a paginated list of notification rules.",
)
async def list_rules(
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    event_type: NotificationEventType | None = Query(None, description="Filter by event type"),
    channel_id: uuid.UUID | None = Query(None, description="Filter by channel ID"),
    is_enabled: bool | None = Query(None, description="Filter by enabled status"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """List all notification rules with pagination."""
    base_query = select(NotificationRule)
    count_query = select(func.count(NotificationRule.id))

    if event_type is not None:
        base_query = base_query.where(NotificationRule.event_type == event_type)
        count_query = count_query.where(NotificationRule.event_type == event_type)

    if channel_id is not None:
        base_query = base_query.where(NotificationRule.channel_id == channel_id)
        count_query = count_query.where(NotificationRule.channel_id == channel_id)

    if is_enabled is not None:
        base_query = base_query.where(NotificationRule.is_enabled == is_enabled)
        count_query = count_query.where(NotificationRule.is_enabled == is_enabled)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        base_query.offset(offset).limit(limit).order_by(NotificationRule.created_at.desc())
    )
    items = result.scalars().all()

    return create_paginated_response(items, total, offset, limit)


@router.post(
    "/rules",
    response_model=NotificationRuleResponse,
    status_code=201,
    summary="Create notification rule",
    description="Create a new notification rule linking an event type to a channel.",
)
async def create_rule(
    data: NotificationRuleCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
):
    """Create a new notification rule."""
    # Verify the channel exists
    ch_result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == data.channel_id)
    )
    if ch_result.scalar_one_or_none() is None:
        raise NotFoundError("NotificationChannel", str(data.channel_id))

    rule = NotificationRule(**data.model_dump())
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


@router.patch(
    "/rules/{rule_id}",
    response_model=NotificationRuleResponse,
    summary="Update notification rule",
    description="Update an existing notification rule.",
    responses={404: {"description": "Rule not found"}},
)
async def update_rule(
    rule_id: uuid.UUID,
    data: NotificationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
):
    """Update a notification rule."""
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError("NotificationRule", str(rule_id))

    update_data = data.model_dump(exclude_unset=True)

    # If channel_id is being changed, verify the new channel exists
    if "channel_id" in update_data:
        ch_result = await db.execute(
            select(NotificationChannel).where(
                NotificationChannel.id == update_data["channel_id"]
            )
        )
        if ch_result.scalar_one_or_none() is None:
            raise NotFoundError("NotificationChannel", str(update_data["channel_id"]))

    for field, value in update_data.items():
        setattr(rule, field, value)

    await db.flush()
    await db.refresh(rule)
    return rule


@router.delete(
    "/rules/{rule_id}",
    status_code=204,
    summary="Delete notification rule",
    description="Delete a notification rule.",
    responses={404: {"description": "Rule not found"}},
)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.admin)),
):
    """Delete a notification rule."""
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError("NotificationRule", str(rule_id))

    await db.delete(rule)
    await db.flush()
