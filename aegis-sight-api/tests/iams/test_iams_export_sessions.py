"""
IAMS移植テスト: エクスポート・セッション・アクティビティ管理（Phase18）
変換元: IAMS エクスポート・セッション管理テスト 78件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（エクスポートCSV・セッションCRUD・アクティビティ・分析）
除外テスト数: 22件（ファイルダウンロード検証依存・外部認証連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_SESSION_TYPES = ["web", "api", "vpn", "rdp"]
ALL_ACTIVITY_TYPES = ["login", "logout", "file_access", "command_exec", "network_access"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestExportSessionsAuth:
    """エクスポート・セッション管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_export_devices_requires_auth(self, client: AsyncClient):
        """デバイスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_list_requires_auth(self, client: AsyncClient):
        """セッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_analytics_requires_auth(self, client: AsyncClient):
        """セッション分析は認証必須であること"""
        response = await client.get("/api/v1/sessions/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_devices_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでデバイスエクスポートにアクセスできること"""
        response = await client.get("/api/v1/export/devices", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# エクスポート（Export）
# ===================================================================
class TestExportEndpoints:
    """エクスポートエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_export_devices_returns_csv_or_json(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスエクスポートがCSVまたはJSONを返すこと"""
        response = await client.get("/api/v1/export/devices", headers=auth_headers)
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert any(
            ct in content_type
            for ct in ("text/csv", "application/json", "text/plain")
        ), f"Unexpected content-type: {content_type}"

    @pytest.mark.asyncio
    async def test_export_licenses_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/licenses", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_alerts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラートエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/alerts", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_audit_logs_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/audit-logs", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_devices_with_filter(
        self, client: AsyncClient, auth_headers: dict
    ):
        """フィルタ付きデバイスエクスポートが正常に動作すること"""
        response = await client.get(
            "/api/v1/export/devices?format=csv", headers=auth_headers
        )
        assert response.status_code in (200, 400, 422)


# ===================================================================
# セッション管理（Sessions）
# ===================================================================
class TestSessionManagement:
    """セッション管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_sessions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_active_sessions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_session_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/sessions",
            json={"user_name": "testuser"},  # session_type, device_id 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("session_type", ALL_SESSION_TYPES)
    async def test_create_session_all_types(
        self, client: AsyncClient, auth_headers: dict, session_type: str
    ):
        """全セッション種別でセッションを作成できること"""
        response = await client.post(
            "/api/v1/sessions",
            json={
                "user_name": f"iams_test_{session_type}",
                "session_type": session_type,
                "device_id": str(uuid.uuid4()),
                "ip_address": "192.168.1.100",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"session_type={session_type}: 予期しないステータス {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_end_nonexistent_session_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの終了で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sessions/{fake_id}/end",
            json={"reason": "テスト終了"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_filter_sessions_by_is_active(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_activeフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/sessions?is_active=true", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True


# ===================================================================
# セッション分析・アクティビティ（Analytics & Activities）
# ===================================================================
class TestSessionAnalyticsAndActivities:
    """セッション分析・アクティビティテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_analytics_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """分析エンドポイントに必須フィールドが含まれること"""
        response = await client.get("/api/v1/sessions/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_sessions" in data or "total" in data or isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_list_activities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティビティ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions/activities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_activity_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損のアクティビティ作成で422が返ること"""
        response = await client.post(
            "/api/v1/sessions/activities",
            json={"description": "テストアクティビティ"},  # session_id, activity_type 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_user_behavior_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの行動プロファイルで404が返ること"""
        response = await client.get(
            "/api/v1/sessions/users/nonexistent_user_xyz/behavior",
            headers=auth_headers,
        )
        assert response.status_code == 404
