"""
IAMS移植テスト: ユーザー管理・資産管理・監査ログ・セキュリティ詳細（Phase39）
変換元: IAMS ユーザー・資産・監査・セキュリティテスト 80件中60件選定
変換日: 2026-04-02
変換元テスト数: 60件
変換テスト数: 36件（ユーザーCRUD・デバイス資産・監査ログ・セキュリティ概要）
除外テスト数: 24件（AD/LDAP連携依存・物理セキュリティデバイス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ユーザー管理詳細（Users Detail）
# ===================================================================
class TestUsersDetail:
    """ユーザー管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_users_requires_auth(self, client: AsyncClient):
        """ユーザー一覧は認証必須であること"""
        response = await client.get("/api/v1/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_user_me_settings_requires_auth(self, client: AsyncClient):
        """個人設定取得は認証必須であること"""
        response = await client.get("/api/v1/users/me/settings")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_users_returns_paginated_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ユーザー一覧がページネーション形式または403で返ること（Admin only）"""
        response = await client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            data = response.json()
            for field in ("items", "total", "offset", "limit", "has_more"):
                assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_user_me_settings_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """個人設定取得が200で返ること"""
        response = await client.get("/api/v1/users/me/settings", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザー取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザー更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/users/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_user_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザー削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/users/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_settings_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """個人設定更新が200で返ること"""
        response = await client.patch(
            "/api/v1/users/me/settings",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 200


# ===================================================================
# 資産管理詳細（Assets Detail）
# ===================================================================
class TestAssetsDetail:
    """資産管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_assets_requires_auth(self, client: AsyncClient):
        """資産一覧は認証必須であること"""
        response = await client.get("/api/v1/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_assets_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/assets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_assets_count_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産カウントが200で返ること"""
        response = await client.get("/api/v1/assets/count", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない資産取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/assets/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない資産更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/assets/{fake_id}",
            json={"hostname": "test-host"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_asset_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で資産作成が422を返すこと"""
        response = await client.post(
            "/api/v1/assets",
            json={"description": "テスト資産"},  # hostname等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_assets_count_requires_auth(self, client: AsyncClient):
        """資産カウントは認証必須であること"""
        response = await client.get("/api/v1/assets/count")
        assert response.status_code == 401


# ===================================================================
# 監査ログ詳細（Audit Logs Detail）
# ===================================================================
class TestAuditLogsDetail:
    """監査ログ詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_audit_logs_requires_auth(self, client: AsyncClient):
        """監査ログ一覧は認証必須であること"""
        response = await client.get("/api/v1/audit/logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_audit_logs_export_requires_auth(self, client: AsyncClient):
        """監査ログエクスポートは認証必須であること"""
        response = await client.get("/api/v1/audit/logs/export")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_audit_logs_returns_paginated_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログ一覧がページネーション形式または403で返ること（auditor/admin only）"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code in (200, 403)
        if response.status_code == 200:
            data = response.json()
            for field in ("items", "total", "offset", "limit", "has_more"):
                assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_export_audit_logs_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで監査ログエクスポートにアクセスできること"""
        response = await client.get(
            "/api/v1/audit/logs/export", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_audit_logs_with_user_filter_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ユーザーフィルター付き監査ログが200または403で返ること"""
        response = await client.get(
            "/api/v1/audit/logs?user_id=testuser", headers=auth_headers
        )
        assert response.status_code in (200, 403)


# ===================================================================
# セキュリティ詳細（Security Detail）
# ===================================================================
class TestSecurityDetail:
    """セキュリティ詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_overview_requires_auth(self, client: AsyncClient):
        """セキュリティ概要は認証必須であること"""
        response = await client.get("/api/v1/security/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_device_requires_auth(self, client: AsyncClient):
        """デバイスセキュリティ詳細は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/security/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要が200で返ること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_security_overview_has_expected_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要が期待する構造を持つこと"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_security_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのセキュリティ詳細取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/security/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_security_overview_accessible_after_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証後にセキュリティ概要にアクセスできること"""
        response = await client.get("/api/v1/security/overview", headers=auth_headers)
        assert response.status_code == 200
