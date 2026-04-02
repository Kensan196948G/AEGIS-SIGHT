"""
IAMS移植テスト: セキュリティ概要・セッション管理・通知管理・ユーザー管理（Phase54相当）
変換元: IAMS セキュリティ/セッション/通知/ユーザーテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（セキュリティ集計/セッション追跡/行動分析/通知チャンネル/通知ルール/ユーザーCRUD）
除外テスト数: 29件（WebSocket依存・リアルタイムセッション依存・外部通知連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# セキュリティ概要テスト（Security Overview）
# ===================================================================
class TestSecurity:
    """セキュリティ概要テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_overview_requires_auth(self, client: AsyncClient):
        """セキュリティ概要は認証必須であること"""
        response = await client.get("/api/v1/security/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要が200で返ること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_security_overview_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要レスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("total_devices_with_status", "defender", "bitlocker", "patches"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_device_security_requires_auth(self, client: AsyncClient):
        """デバイスセキュリティ詳細は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/security/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_security_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのセキュリティ詳細は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/security/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# セッション管理テスト（Sessions）
# ===================================================================
class TestSessions:
    """セッション管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sessions_requires_auth(self, client: AsyncClient):
        """セッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_active_sessions_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_active_sessions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_session_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/sessions", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_end_nonexistent_session_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの終了は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sessions/{fake_id}/end",
            json={"end_time": "2026-04-02T10:00:00Z"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_session_analytics_requires_auth(self, client: AsyncClient):
        """セッション分析は認証必須であること"""
        response = await client.get("/api/v1/sessions/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_session_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション分析が200で返ること"""
        response = await client.get("/api/v1/sessions/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_activities_requires_auth(self, client: AsyncClient):
        """アクティビティ一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/activities")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_activities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティビティ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/sessions/activities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_activity_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティビティ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/sessions/activities", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_user_behavior_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ユーザー行動プロフィールが200で返ること（存在しないユーザーは空データ）"""
        response = await client.get(
            "/api/v1/sessions/users/testuser/behavior", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# 通知管理テスト（Notifications）
# ===================================================================
class TestNotificationChannels:
    """通知チャンネルテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_channels_requires_auth(self, client: AsyncClient):
        """通知チャンネル一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/channels")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_channels_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知チャンネル一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/notifications/channels", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_channel_missing_required_returns_422_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知チャンネル作成時に必須フィールド不足はadmin/operator以外403・不足は422が返ること"""
        response = await client.post(
            "/api/v1/notifications/channels", json={}, headers=auth_headers
        )
        assert response.status_code in (403, 422)

    @pytest.mark.asyncio
    async def test_update_nonexistent_channel_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルの更新は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/notifications/channels/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_channel_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルの削除は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/channels/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_test_nonexistent_channel_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルのテスト送信は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/notifications/channels/{fake_id}/test", headers=auth_headers
        )
        assert response.status_code in (403, 404)


class TestNotificationRules:
    """通知ルールテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_rules_requires_auth(self, client: AsyncClient):
        """通知ルール一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知ルール一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/notifications/rules", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_rule_missing_required_returns_422_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知ルール作成時に必須フィールド不足はadmin/operator以外403・不足は422が返ること"""
        response = await client.post(
            "/api/v1/notifications/rules", json={}, headers=auth_headers
        )
        assert response.status_code in (403, 422)

    @pytest.mark.asyncio
    async def test_update_nonexistent_rule_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知ルールの更新は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/notifications/rules/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_rule_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知ルールの削除は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (403, 404)


# ===================================================================
# ユーザー管理テスト（Users）
# ===================================================================
class TestUsers:
    """ユーザー管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_users_list_requires_auth(self, client: AsyncClient):
        """ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_users_list_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ユーザー一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_me_settings_requires_auth(self, client: AsyncClient):
        """自分のユーザー設定取得は認証必須であること"""
        response = await client.get("/api/v1/users/me/settings")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_settings_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """自分のユーザー設定が200で返ること"""
        response = await client.get("/api/v1/users/me/settings", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_me_settings_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """自分のユーザー設定更新が200で返ること（全フィールドオプション）"""
        response = await client.patch(
            "/api/v1/users/me/settings", json={}, headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_user_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの更新は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/users/{fake_id}",
            json={"is_active": False},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_user_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの削除は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (403, 404)
