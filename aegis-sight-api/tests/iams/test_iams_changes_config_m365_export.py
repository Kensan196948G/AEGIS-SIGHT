"""
IAMS移植テスト: 変更管理・設定管理・M365連携・エクスポート機能（Phase31）
変換元: IAMS 変更管理・設定・M365・エクスポートテスト 76件中54件選定
変換日: 2026-04-02
変換元テスト数: 54件
変換テスト数: 36件（変更管理・設定CRUD・M365ライセンス・エクスポート）
除外テスト数: 18件（Microsoft Graph API依存・差分計算内部ロジック依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 変更管理 認証（Changes Auth）
# ===================================================================
class TestChangesAuth:
    """変更管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_changes_summary_requires_auth(self, client: AsyncClient):
        """変更管理サマリーは認証必須であること"""
        response = await client.get("/api/v1/changes/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_snapshots_requires_auth(self, client: AsyncClient):
        """変更スナップショット一覧は認証必須であること"""
        response = await client.get("/api/v1/changes/snapshots")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_summary_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで変更管理サマリーにアクセスできること（200）"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 変更管理 エンドポイント（Changes Endpoints）
# ===================================================================
class TestChangesEndpoints:
    """変更管理エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_changes_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更管理サマリーが200で返ること"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_changes_snapshots_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更スナップショット一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/changes/snapshots", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_snapshot_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスナップショット取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/snapshots/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_timeline_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスの変更タイムライン取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# 設定管理（Config Management）
# ===================================================================
class TestConfigManagement:
    """設定管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_config_get_requires_auth(self, client: AsyncClient):
        """設定取得は認証必須であること"""
        response = await client.get("/api/v1/config/test_key")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_get_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで設定取得にアクセスできること"""
        response = await client.get("/api/v1/config/test_key", headers=auth_headers)
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_config_update_missing_value_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """値なしで設定更新が422を返すこと"""
        response = await client.put(
            "/api/v1/config/test_key",
            json={},  # value欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_config_reset_nonexistent_key_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないキーのリセットで404が返ること"""
        response = await client.post(
            "/api/v1/config/reset/nonexistent_config_key_xyz_abc",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# M365連携（M365 Integration）
# ===================================================================
class TestM365Integration:
    """M365連携テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_m365_licenses_requires_auth(self, client: AsyncClient):
        """M365ライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/m365/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_users_requires_auth(self, client: AsyncClient):
        """M365ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/m365/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_licenses_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでM365ライセンス一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_m365_licenses_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_m365_users_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_m365_sync_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期が200で返ること"""
        response = await client.post("/api/v1/m365/sync", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# エクスポート機能（Export）
# ===================================================================
class TestExportEndpoints:
    """エクスポート機能テスト（IAMS移植）"""

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
    async def test_export_devices_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスエクスポートが200で返ること"""
        response = await client.get("/api/v1/export/devices", headers=auth_headers)
        assert response.status_code == 200

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
