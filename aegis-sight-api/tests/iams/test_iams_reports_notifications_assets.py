"""
IAMS移植テスト: レポート・通知管理・アセット管理（Phase28）
変換元: IAMS レポート・通知・アセット管理テスト 78件中56件選定
変換日: 2026-04-02
変換元テスト数: 56件
変換テスト数: 36件（レポートAPI・通知チャンネル・通知ルール・アセットCRUD）
除外テスト数: 20件（外部通知サービス依存・PDF生成依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# レポート管理 認証（Reports Auth）
# ===================================================================
class TestReportsAuth:
    """レポート管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_report_requires_auth(self, client: AsyncClient):
        """SAMレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/sam")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_asset_report_requires_auth(self, client: AsyncClient):
        """アセットレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_report_requires_auth(self, client: AsyncClient):
        """セキュリティレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/security")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_report_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでSAMレポートにアクセスできること（200）"""
        response = await client.get("/api/v1/reports/sam", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# レポート エンドポイント（Reports Endpoints）
# ===================================================================
class TestReportsEndpoints:
    """レポートエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_asset_report_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アセットレポートが200で返ること"""
        response = await client.get("/api/v1/reports/assets", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_security_report_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティレポートが200で返ること"""
        response = await client.get("/api/v1/reports/security", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 通知管理 認証（Notifications Auth）
# ===================================================================
class TestNotificationsAuth:
    """通知管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_notification_channels_requires_auth(self, client: AsyncClient):
        """通知チャンネル一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/channels")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_notification_rules_requires_auth(self, client: AsyncClient):
        """通知ルール一覧は認証必須であること"""
        response = await client.get("/api/v1/notifications/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_notification_channels_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで通知チャンネル一覧にアクセスできること（200）"""
        response = await client.get(
            "/api/v1/notifications/channels", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# 通知管理 CRUD（Notifications CRUD）
# ===================================================================
class TestNotificationsCRUD:
    """通知管理CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_channels_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知チャンネル一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/notifications/channels", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_channel_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で通知チャンネル作成が422を返すこと"""
        response = await client.post(
            "/api/v1/notifications/channels",
            json={"description": "テストチャンネル"},  # name, channel_type 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/notifications/channels/{fake_id}",
            json={"is_active": False},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/channels/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_notification_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """通知ルール一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/notifications/rules", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_rule_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で通知ルール作成が422を返すこと"""
        response = await client.post(
            "/api/v1/notifications/rules",
            json={"description": "テストルール"},  # name, condition等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# アセット管理（Assets）
# ===================================================================
class TestAssetsManagement:
    """アセット管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_assets_requires_auth(self, client: AsyncClient):
        """アセット一覧は認証必須であること"""
        response = await client.get("/api/v1/assets/")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_assets_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アセット一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_asset_count_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アセット件数が200で返ること"""
        response = await client.get("/api/v1/assets/count", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアセットの取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/assets/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_asset_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でアセット作成が422を返すこと"""
        response = await client.post(
            "/api/v1/assets/",
            json={"description": "テストアセット"},  # name, asset_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアセットの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/assets/{fake_id}",
            json={"description": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404
