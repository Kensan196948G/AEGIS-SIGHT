import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_channel import (
    ChannelType,
    NotificationChannel,
    NotificationEventType,
    NotificationRule,
)


async def _create_channel(
    db: AsyncSession,
    name: str = "Test Channel",
    channel_type: ChannelType = ChannelType.email,
    config: dict | None = None,
    is_enabled: bool = True,
    created_by: uuid.UUID | None = None,
) -> NotificationChannel:
    """Helper to insert a test notification channel."""
    channel = NotificationChannel(
        name=name,
        channel_type=channel_type,
        config=config or {"to_email": "test@aegis-sight.local"},
        is_enabled=is_enabled,
        created_by=created_by,
    )
    db.add(channel)
    await db.flush()
    await db.refresh(channel)
    return channel


async def _create_rule(
    db: AsyncSession,
    channel_id: uuid.UUID,
    name: str = "Test Rule",
    event_type: NotificationEventType = NotificationEventType.alert_critical,
) -> NotificationRule:
    """Helper to insert a test notification rule."""
    rule = NotificationRule(
        name=name,
        event_type=event_type,
        channel_id=channel_id,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


# ---------------------------------------------------------------------------
# Channel tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_channels_unauthorized(client: AsyncClient):
    """Test that listing channels requires authentication."""
    response = await client.get("/api/v1/notifications/channels")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_channels(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Test listing channels with authentication."""
    await _create_channel(db_session)
    response = await client.get("/api/v1/notifications/channels", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_channel(client: AsyncClient, auth_headers: dict):
    """Test creating a new notification channel."""
    payload = {
        "name": "Slack Alerts",
        "channel_type": "slack",
        "config": {"webhook_url": "https://hooks.slack.com/services/xxx"},
        "is_enabled": True,
    }
    response = await client.post(
        "/api/v1/notifications/channels", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Slack Alerts"
    assert data["channel_type"] == "slack"
    assert data["is_enabled"] is True
    assert data["config"]["webhook_url"] == "https://hooks.slack.com/services/xxx"


@pytest.mark.asyncio
async def test_update_channel(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test updating a notification channel."""
    channel = await _create_channel(db_session)
    payload = {"name": "Updated Channel", "is_enabled": False}
    response = await client.patch(
        f"/api/v1/notifications/channels/{channel.id}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Channel"
    assert data["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_channel_not_found(client: AsyncClient, auth_headers: dict):
    """Test updating a non-existent channel returns 404."""
    response = await client.patch(
        "/api/v1/notifications/channels/00000000-0000-0000-0000-000000000000",
        json={"name": "Nope"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_channel(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test deleting a notification channel."""
    channel = await _create_channel(db_session)
    response = await client.delete(
        f"/api/v1/notifications/channels/{channel.id}", headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_channel_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent channel returns 404."""
    response = await client.delete(
        "/api/v1/notifications/channels/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_test_channel_disabled(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that testing a disabled channel returns failure."""
    channel = await _create_channel(db_session, is_enabled=False)
    response = await client.post(
        f"/api/v1/notifications/channels/{channel.id}/test", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "disabled" in data["message"].lower()


@pytest.mark.asyncio
async def test_test_channel_not_found(client: AsyncClient, auth_headers: dict):
    """Test that testing a non-existent channel returns 404."""
    response = await client.post(
        "/api/v1/notifications/channels/00000000-0000-0000-0000-000000000000/test",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_channels_filter_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering channels by channel_type."""
    await _create_channel(db_session, name="Webhook One", channel_type=ChannelType.webhook,
                          config={"url": "https://example.com/hook"})
    response = await client.get(
        "/api/v1/notifications/channels?channel_type=webhook", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["channel_type"] == "webhook"


# ---------------------------------------------------------------------------
# Rule tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_rules_unauthorized(client: AsyncClient):
    """Test that listing rules requires authentication."""
    response = await client.get("/api/v1/notifications/rules")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_rule(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test creating a notification rule."""
    channel = await _create_channel(db_session)
    payload = {
        "name": "Critical Alert Rule",
        "event_type": "alert_critical",
        "channel_id": str(channel.id),
        "is_enabled": True,
    }
    response = await client.post(
        "/api/v1/notifications/rules", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Critical Alert Rule"
    assert data["event_type"] == "alert_critical"
    assert data["channel_id"] == str(channel.id)


@pytest.mark.asyncio
async def test_create_rule_invalid_channel(client: AsyncClient, auth_headers: dict):
    """Test creating a rule with a non-existent channel returns 404."""
    payload = {
        "name": "Bad Rule",
        "event_type": "alert_warning",
        "channel_id": "00000000-0000-0000-0000-000000000000",
    }
    response = await client.post(
        "/api/v1/notifications/rules", json=payload, headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_rules(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing rules with authentication."""
    channel = await _create_channel(db_session, name="Rule List Channel")
    await _create_rule(db_session, channel_id=channel.id)
    response = await client.get("/api/v1/notifications/rules", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_update_rule(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test updating a notification rule."""
    channel = await _create_channel(db_session, name="Update Rule Channel")
    rule = await _create_rule(db_session, channel_id=channel.id)
    payload = {"name": "Updated Rule", "is_enabled": False}
    response = await client.patch(
        f"/api/v1/notifications/rules/{rule.id}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Rule"
    assert data["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_rule_not_found(client: AsyncClient, auth_headers: dict):
    """Test updating a non-existent rule returns 404."""
    response = await client.patch(
        "/api/v1/notifications/rules/00000000-0000-0000-0000-000000000000",
        json={"name": "Nope"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_rule(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test deleting a notification rule."""
    channel = await _create_channel(db_session, name="Delete Rule Channel")
    rule = await _create_rule(db_session, channel_id=channel.id)
    response = await client.delete(
        f"/api/v1/notifications/rules/{rule.id}", headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_rule_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent rule returns 404."""
    response = await client.delete(
        "/api/v1/notifications/rules/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_rules_filter_event_type(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test filtering rules by event_type."""
    channel = await _create_channel(db_session, name="Filter Event Channel")
    await _create_rule(
        db_session,
        channel_id=channel.id,
        name="License Rule",
        event_type=NotificationEventType.license_violation,
    )
    response = await client.get(
        "/api/v1/notifications/rules?event_type=license_violation",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["event_type"] == "license_violation"
