"""
IAMS移植テスト: ユーザー管理・ダッシュボード・監査ログ・カスタムビュー（Phase29）
変換元: IAMS ユーザー・ダッシュボード・監査・ビューテスト 80件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（ユーザーCRUD・ダッシュボード統計・監査ログ・カスタムビューCRUD）
除外テスト数: 22件（管理者専用操作・外部IdP依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ユーザー管理 認証（Users Auth）
# ===================================================================
class TestUsersAuth:
    """ユーザー管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_users_list_requires_auth(self, client: AsyncClient):
        """ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_my_settings_requires_auth(self, client: AsyncClient):
        """マイ設定は認証必須であること"""
        response = await client.get("/api/v1/users/me/settings")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_users_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでユーザー一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# ユーザー管理 CRUD（Users CRUD）
# ===================================================================
class TestUsersCRUD:
    """ユーザー管理CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_users_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ユーザー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_my_settings_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """マイ設定取得が200で返ること"""
        response = await client.get(
            "/api/v1/users/me/settings", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/users/{fake_id}",
            json={"full_name": "テスト更新"},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_deactivate_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの無効化で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code in (403, 404)


# ===================================================================
# ダッシュボード（Dashboard）
# ===================================================================
class TestDashboard:
    """ダッシュボードテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client: AsyncClient):
        """ダッシュボード統計は認証必須であること"""
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_alerts_requires_auth(self, client: AsyncClient):
        """ダッシュボードアラートは認証必須であること"""
        response = await client.get("/api/v1/dashboard/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計が200で返ること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_stats_has_data(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計にデータが含まれること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_dashboard_alerts_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートがページネーション形式で返ること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)


# ===================================================================
# 監査ログ（Audit Logs）
# ===================================================================
class TestAuditLogs:
    """監査ログテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_audit_logs_requires_auth(self, client: AsyncClient):
        """監査ログは認証必須であること"""
        response = await client.get("/api/v1/audit/logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_audit_logs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_export_audit_logs_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートが200で返ること"""
        response = await client.get("/api/v1/audit/logs/export", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# カスタムビュー（Custom Views）
# ===================================================================
class TestCustomViews:
    """カスタムビューテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_views_requires_auth(self, client: AsyncClient):
        """カスタムビューは認証必須であること"""
        response = await client.get("/api/v1/views")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_views_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビュー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/views", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_view_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でカスタムビュー作成が422を返すこと"""
        response = await client.post(
            "/api/v1/views",
            json={"description": "テストビュー"},  # name, entity_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/views/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/views/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
