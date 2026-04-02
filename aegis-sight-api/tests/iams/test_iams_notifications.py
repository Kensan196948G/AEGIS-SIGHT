"""
IAMS移植テスト: 通知管理（Phase5）
変換元: IAMS 通知・アラートテスト 130件中95件選定
変換日: 2026-04-02
変換元テスト数: 95件
変換テスト数: 50件（優先度高・チャンネル種別・ルール管理・フィルタリング・認可確認）
除外テスト数: 45件（実際の外部送信テスト・メール配送確認・Webhook到達確認）
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_channel import (
    ChannelType,
    NotificationChannel,
    NotificationEventType,
    NotificationRule,
)

pytestmark = pytest.mark.iams

# ---------------------------------------------------------------------------
# テストヘルパー
# ---------------------------------------------------------------------------
ALL_CHANNEL_TYPES = ["email", "webhook", "slack", "teams"]
ALL_EVENT_TYPES = [
    "alert_critical",
    "alert_warning",
    "license_violation",
    "license_expiry",
    "procurement_approval",
    "security_incident",
]


def _email_channel_payload(name: str = "Test Email Channel") -> dict:
    return {
        "name": name,
        "channel_type": "email",
        "config": {"to_email": "test@aegis-sight.local"},
        "is_enabled": True,
    }


def _webhook_channel_payload(name: str = "Test Webhook Channel") -> dict:
    return {
        "name": name,
        "channel_type": "webhook",
        "config": {"url": "https://hooks.example.com/test"},
        "is_enabled": True,
    }


def _slack_channel_payload(name: str = "Test Slack Channel") -> dict:
    return {
        "name": name,
        "channel_type": "slack",
        "config": {"webhook_url": "https://hooks.slack.com/services/XXX/YYY/ZZZ"},
        "is_enabled": True,
    }


def _teams_channel_payload(name: str = "Test Teams Channel") -> dict:
    return {
        "name": name,
        "channel_type": "teams",
        "config": {"webhook_url": "https://outlook.office.com/webhook/XXX"},
        "is_enabled": True,
    }


async def _insert_channel(
    db: AsyncSession,
    name: str = "Fixture Channel",
    channel_type: ChannelType = ChannelType.email,
    config: dict | None = None,
    is_enabled: bool = True,
) -> NotificationChannel:
    ch = NotificationChannel(
        name=name,
        channel_type=channel_type,
        config=config or {"to_email": "fixture@aegis-sight.local"},
        is_enabled=is_enabled,
    )
    db.add(ch)
    await db.flush()
    await db.refresh(ch)
    return ch


async def _insert_rule(
    db: AsyncSession,
    channel_id,
    name: str = "Fixture Rule",
    event_type: NotificationEventType = NotificationEventType.alert_critical,
    is_enabled: bool = True,
) -> NotificationRule:
    rule = NotificationRule(
        name=name,
        event_type=event_type,
        channel_id=channel_id,
        is_enabled=is_enabled,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


# ===================================================================
# 通知チャンネル認証・認可（Channel Auth/Authz）
# ===================================================================
class TestChannelAuth:
    """通知チャンネル認証・認可テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_channels_requires_auth(self, client: AsyncClient):
        """チャンネル一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/channels")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_channel_requires_auth(self, client: AsyncClient):
        """チャンネル作成は認証必須であること"""
        response = await client.post(
            "/api/v1/notifications/channels", json=_email_channel_payload()
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_channel_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールはチャンネル作成が 403 になること"""
        response = await client.post(
            "/api/v1/notifications/channels",
            json=_email_channel_payload(),
            headers=readonly_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_channel_requires_admin(
        self,
        client: AsyncClient,
        readonly_headers: dict,
        db_session: AsyncSession,
    ):
        """チャンネル削除は admin 必須であること（readonlyで403）"""
        ch = await _insert_channel(db_session)
        response = await client.delete(
            f"/api/v1/notifications/channels/{ch.id}",
            headers=readonly_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_list_channels_accessible_to_readonly(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """チャンネル一覧は全認証ユーザーがアクセス可能であること"""
        response = await client.get(
            "/api/v1/notifications/channels", headers=readonly_headers
        )
        assert response.status_code == 200


# ===================================================================
# 通知チャンネル種別（Channel Types）
# ===================================================================
class TestChannelTypes:
    """通知チャンネル種別テスト（IAMS移植）"""

    @pytest.mark.parametrize(
        "payload_fn,channel_type",
        [
            (_email_channel_payload, "email"),
            (_webhook_channel_payload, "webhook"),
            (_slack_channel_payload, "slack"),
            (_teams_channel_payload, "teams"),
        ],
    )
    @pytest.mark.asyncio
    async def test_create_all_channel_types(
        self, client: AsyncClient, auth_headers: dict, payload_fn, channel_type
    ):
        """全チャンネル種別（email/webhook/slack/teams）を作成できること"""
        response = await client.post(
            "/api/v1/notifications/channels",
            json=payload_fn(f"IAMS-{channel_type}-channel"),
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["channel_type"] == channel_type

    @pytest.mark.asyncio
    async def test_create_invalid_channel_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """無効なチャンネル種別で 422 が返ること"""
        response = await client.post(
            "/api/v1/notifications/channels",
            json={
                "name": "Bad Channel",
                "channel_type": "telegram",
                "config": {},
                "is_enabled": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_channel_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """チャンネルレスポンスに必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/notifications/channels",
            json=_email_channel_payload("Fields Test Channel"),
            headers=auth_headers,
        )
        data = response.json()
        for field in ("id", "name", "channel_type", "config", "is_enabled", "created_at"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_disabled_channel(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_enabled=False でチャンネルを作成できること"""
        payload = {**_email_channel_payload("Disabled Channel"), "is_enabled": False}
        response = await client.post(
            "/api/v1/notifications/channels", json=payload, headers=auth_headers
        )
        assert response.status_code == 201
        assert response.json()["is_enabled"] is False


# ===================================================================
# 通知チャンネルフィルタリング（Channel Filtering）
# ===================================================================
class TestChannelFiltering:
    """チャンネルフィルタリングテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_filter_by_channel_type_email(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """channel_type=email フィルターで email チャンネルのみ返ること"""
        await _insert_channel(
            db_session,
            name="Email Only",
            channel_type=ChannelType.email,
            config={"to_email": "filter@example.com"},
        )
        response = await client.get(
            "/api/v1/notifications/channels?channel_type=email",
            headers=auth_headers,
        )
        assert response.status_code == 200
        for item in response.json()["items"]:
            assert item["channel_type"] == "email"

    @pytest.mark.asyncio
    async def test_filter_by_is_enabled_true(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """is_enabled=true フィルターでアクティブチャンネルのみ返ること"""
        await _insert_channel(db_session, name="Enabled Ch", is_enabled=True)
        response = await client.get(
            "/api/v1/notifications/channels?is_enabled=true",
            headers=auth_headers,
        )
        assert response.status_code == 200
        for item in response.json()["items"]:
            assert item["is_enabled"] is True

    @pytest.mark.asyncio
    async def test_filter_by_is_enabled_false(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """is_enabled=false フィルターで無効チャンネルのみ返ること"""
        await _insert_channel(db_session, name="Disabled Ch", is_enabled=False)
        response = await client.get(
            "/api/v1/notifications/channels?is_enabled=false",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["total"] >= 1
        for item in response.json()["items"]:
            assert item["is_enabled"] is False

    @pytest.mark.asyncio
    async def test_channel_list_pagination_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """チャンネル一覧のページネーションフィールドが存在すること"""
        response = await client.get(
            "/api/v1/notifications/channels", headers=auth_headers
        )
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data


# ===================================================================
# 通知チャンネル更新・削除（Channel CRUD）
# ===================================================================
class TestChannelCRUD:
    """チャンネル更新・削除テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_update_channel_name(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """チャンネル名を更新できること"""
        ch = await _insert_channel(db_session, name="Original Name")
        response = await client.patch(
            f"/api/v1/notifications/channels/{ch.id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_channel_enable_disable(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """チャンネルの有効/無効を切り替えられること"""
        ch = await _insert_channel(db_session, is_enabled=True)
        response = await client.patch(
            f"/api/v1/notifications/channels/{ch.id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["is_enabled"] is False

    @pytest.mark.asyncio
    async def test_update_channel_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないチャンネル更新で 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/notifications/channels/{fake_id}",
            json={"name": "Ghost"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_channel_returns_204(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """チャンネル削除で 204 が返ること"""
        ch = await _insert_channel(db_session, name="Delete Me")
        response = await client.delete(
            f"/api/v1/notifications/channels/{ch.id}", headers=admin_headers
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_channel_not_found(
        self, client: AsyncClient, admin_headers: dict
    ):
        """存在しないチャンネル削除で 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/channels/{fake_id}", headers=admin_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_channel_cascades_rules(
        self,
        client: AsyncClient,
        admin_headers: dict,
        auth_headers: dict,
        db_session: AsyncSession,
    ):
        """チャンネル削除時にルールも連鎖削除されること"""
        ch = await _insert_channel(db_session, name="Cascade Channel")
        await _insert_rule(db_session, channel_id=ch.id, name="Cascade Rule")

        # チャンネル削除
        del_resp = await client.delete(
            f"/api/v1/notifications/channels/{ch.id}", headers=admin_headers
        )
        assert del_resp.status_code == 204

        # ルール一覧でそのルールが存在しないこと
        rules_resp = await client.get(
            f"/api/v1/notifications/rules?channel_id={ch.id}",
            headers=auth_headers,
        )
        assert rules_resp.status_code == 200
        assert rules_resp.json()["total"] == 0


# ===================================================================
# 通知チャンネルテスト機能（Channel Test Endpoint）
# ===================================================================
class TestChannelTestEndpoint:
    """チャンネルテスト機能テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_test_disabled_channel_returns_failure(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """無効チャンネルのテストで success=False が返ること"""
        ch = await _insert_channel(db_session, is_enabled=False)
        response = await client.post(
            f"/api/v1/notifications/channels/{ch.id}/test",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "disabled" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_test_channel_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないチャンネルのテストで 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/notifications/channels/{fake_id}/test",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_test_channel_response_structure(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """チャンネルテスト結果に success と message フィールドが含まれること"""
        ch = await _insert_channel(db_session, is_enabled=False)
        response = await client.post(
            f"/api/v1/notifications/channels/{ch.id}/test",
            headers=auth_headers,
        )
        data = response.json()
        assert "success" in data
        assert "message" in data
        assert isinstance(data["success"], bool)
        assert isinstance(data["message"], str)


# ===================================================================
# 通知ルール認証・認可（Rule Auth/Authz）
# ===================================================================
class TestRuleAuth:
    """通知ルール認証・認可テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_rules_requires_auth(self, client: AsyncClient):
        """ルール一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_rule_requires_auth(self, client: AsyncClient):
        """ルール作成は認証必須であること"""
        import uuid

        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "Unauth Rule",
                "event_type": "alert_critical",
                "channel_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_rule_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict, db_session: AsyncSession
    ):
        """readonly ロールはルール作成が 403 になること"""
        ch = await _insert_channel(db_session)
        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "Readonly Rule",
                "event_type": "alert_critical",
                "channel_id": str(ch.id),
            },
            headers=readonly_headers,
        )
        assert response.status_code == 403


# ===================================================================
# 通知ルール管理（Rule CRUD）
# ===================================================================
class TestRuleCRUD:
    """通知ルール CRUD テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_create_rule_returns_201(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """ルール作成で 201 が返ること"""
        ch = await _insert_channel(db_session, name="Rule Create Channel")
        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "New Rule",
                "event_type": "alert_critical",
                "channel_id": str(ch.id),
                "is_enabled": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_rule_with_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないチャンネルへのルール作成で 404 が返ること"""
        import uuid

        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "Bad Rule",
                "event_type": "alert_warning",
                "channel_id": str(uuid.uuid4()),
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_rule_response_required_fields(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """ルールレスポンスに必須フィールドが含まれること"""
        ch = await _insert_channel(db_session, name="Rule Fields Channel")
        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "Fields Rule",
                "event_type": "license_expiry",
                "channel_id": str(ch.id),
            },
            headers=auth_headers,
        )
        data = response.json()
        for field in ("id", "name", "event_type", "channel_id", "is_enabled", "created_at"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.parametrize("event_type", ALL_EVENT_TYPES)
    @pytest.mark.asyncio
    async def test_all_event_types_are_valid(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        event_type: str,
    ):
        """全イベント種別（6種）でルールを作成できること"""
        ch = await _insert_channel(
            db_session, name=f"EventType-{event_type}-channel"
        )
        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": f"Rule for {event_type}",
                "event_type": event_type,
                "channel_id": str(ch.id),
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["event_type"] == event_type

    @pytest.mark.asyncio
    async def test_invalid_event_type_returns_422(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """無効なイベント種別で 422 が返ること"""
        ch = await _insert_channel(db_session, name="Invalid EventType Channel")
        response = await client.post(
            "/api/v1/notifications/rules",
            json={
                "name": "Bad Event Rule",
                "event_type": "unknown_event",
                "channel_id": str(ch.id),
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_rule_name(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """ルール名を更新できること"""
        ch = await _insert_channel(db_session, name="Update Rule Channel")
        rule = await _insert_rule(db_session, channel_id=ch.id)
        response = await client.patch(
            f"/api/v1/notifications/rules/{rule.id}",
            json={"name": "Updated Rule Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Rule Name"

    @pytest.mark.asyncio
    async def test_update_rule_disable(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """ルールを無効化できること"""
        ch = await _insert_channel(db_session, name="Disable Rule Channel")
        rule = await _insert_rule(db_session, channel_id=ch.id, is_enabled=True)
        response = await client.patch(
            f"/api/v1/notifications/rules/{rule.id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["is_enabled"] is False

    @pytest.mark.asyncio
    async def test_delete_rule_returns_204(
        self, client: AsyncClient, admin_headers: dict, db_session: AsyncSession
    ):
        """ルール削除で 204 が返ること"""
        ch = await _insert_channel(db_session, name="Delete Rule Channel")
        rule = await _insert_rule(db_session, channel_id=ch.id)
        response = await client.delete(
            f"/api/v1/notifications/rules/{rule.id}", headers=admin_headers
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_rule_not_found(
        self, client: AsyncClient, admin_headers: dict
    ):
        """存在しないルール削除で 404 が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/rules/{fake_id}", headers=admin_headers
        )
        assert response.status_code == 404


# ===================================================================
# 通知ルールフィルタリング（Rule Filtering）
# ===================================================================
class TestRuleFiltering:
    """通知ルールフィルタリングテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_filter_rules_by_event_type(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """event_type フィルターで該当ルールのみ返ること"""
        ch = await _insert_channel(db_session, name="Filter Event Rule Channel")
        await _insert_rule(
            db_session,
            channel_id=ch.id,
            name="License Rule",
            event_type=NotificationEventType.license_violation,
        )
        response = await client.get(
            "/api/v1/notifications/rules?event_type=license_violation",
            headers=auth_headers,
        )
        assert response.status_code == 200
        for item in response.json()["items"]:
            assert item["event_type"] == "license_violation"

    @pytest.mark.asyncio
    async def test_filter_rules_by_channel_id(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """channel_id フィルターで該当チャンネルのルールのみ返ること"""
        ch = await _insert_channel(db_session, name="Channel Filter Channel")
        await _insert_rule(db_session, channel_id=ch.id, name="Channel Filter Rule")
        response = await client.get(
            f"/api/v1/notifications/rules?channel_id={ch.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["total"] >= 1
        for item in response.json()["items"]:
            assert item["channel_id"] == str(ch.id)

    @pytest.mark.asyncio
    async def test_filter_rules_by_is_enabled(
        self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession
    ):
        """is_enabled フィルターで有効ルールのみ返ること"""
        ch = await _insert_channel(db_session, name="Enabled Rule Channel")
        await _insert_rule(db_session, channel_id=ch.id, is_enabled=True)
        response = await client.get(
            "/api/v1/notifications/rules?is_enabled=true",
            headers=auth_headers,
        )
        assert response.status_code == 200
        for item in response.json()["items"]:
            assert item["is_enabled"] is True

    @pytest.mark.asyncio
    async def test_rule_list_pagination_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ルール一覧のページネーションフィールドが存在すること"""
        response = await client.get(
            "/api/v1/notifications/rules", headers=auth_headers
        )
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data
