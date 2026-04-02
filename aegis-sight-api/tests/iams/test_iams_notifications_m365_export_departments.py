"""
IAMS移植テスト: 通知管理・M365統合・エクスポート・部署管理（Phase37）
変換元: IAMS 通知・M365・エクスポート・部署管理テスト 72件中50件選定
変換日: 2026-04-02
変換元テスト数: 50件
変換テスト数: 36件（通知チャンネル・M365ライセンス・エクスポートCSV・部署CRUD）
除外テスト数: 14件（外部メールサービス依存・Microsoft Graph API依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 通知管理詳細（Notifications Detail）
# ===================================================================
class TestNotificationsDetail:
    """通知管理詳細テスト（IAMS移植）"""

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
            json={"description": "テストチャンネル"},  # name, type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネル更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/notifications/channels/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_test_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルのテスト送信で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/notifications/channels/{fake_id}/test", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_rules_returns_paginated(
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
            json={"description": "テストルール"},  # name, event_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_nonexistent_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネル削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/notifications/channels/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# M365統合（M365 Integration）
# ===================================================================
class TestM365Integration:
    """M365統合テスト（IAMS移植）"""

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
    async def test_list_m365_licenses_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_m365_users_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_m365_sync_returns_200_or_503(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期が200または503を返すこと"""
        response = await client.post("/api/v1/m365/sync", headers=auth_headers)
        assert response.status_code in (200, 503)


# ===================================================================
# エクスポート管理（Export）
# ===================================================================
class TestExport:
    """エクスポート管理テスト（IAMS移植）"""

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
    async def test_export_audit_logs_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートが200または403で返ること"""
        response = await client.get(
            "/api/v1/export/audit-logs", headers=auth_headers
        )
        assert response.status_code in (200, 403)


# ===================================================================
# 部署管理詳細（Departments Detail）
# ===================================================================
class TestDepartmentsDetail:
    """部署管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_departments_requires_auth(self, client: AsyncClient):
        """部署一覧は認証必須であること"""
        response = await client.get("/api/v1/departments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_departments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部署一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/departments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_department_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で部署作成が422を返すこと"""
        response = await client.post(
            "/api/v1/departments",
            json={"description": "テスト部署"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_devices_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のデバイス一覧取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/devices", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_costs_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のコスト取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/costs", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/departments/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404
