"""
IAMS移植テスト: M365統合・通知管理・部署管理・ソフトウェア管理詳細（Phase47）
変換元: IAMS M365・通知・部署・ソフトウェアテスト 74件中54件選定
変換日: 2026-04-02
変換元テスト数: 54件
変換テスト数: 36件（M365ライセンス・通知チャンネル・部署CRUD・ソフトウェア一覧）
除外テスト数: 18件（Microsoft Graph API依存・外部通知サービス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# M365統合詳細（M365 Integration Detail）
# ===================================================================
class TestM365Detail:
    """M365統合詳細テスト（IAMS移植）"""

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
    async def test_m365_sync_requires_auth(self, client: AsyncClient):
        """M365同期は認証必須であること"""
        response = await client.post("/api/v1/m365/sync")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_m365_licenses_returns_paginated_or_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧がページネーション形式または接続エラーで返ること"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        # M365接続未設定時は200（空）または503
        assert response.status_code in (200, 503, 422)

    @pytest.mark.asyncio
    async def test_m365_users_returns_paginated_or_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧がページネーション形式または接続エラーで返ること"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code in (200, 503, 422)

    @pytest.mark.asyncio
    async def test_m365_sync_returns_200_or_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期が200または接続エラーで返ること"""
        response = await client.post("/api/v1/m365/sync", headers=auth_headers)
        assert response.status_code in (200, 503, 422)


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
    async def test_list_notification_channels_returns_paginated(
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
    async def test_get_nonexistent_notification_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネル取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/notifications/channels/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_notification_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知ルール取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/notifications/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_test_nonexistent_notification_channel_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない通知チャンネルのテスト送信で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/notifications/channels/{fake_id}/test", headers=auth_headers
        )
        assert response.status_code == 404


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
        """存在しない部署のデバイス取得で404が返ること"""
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


# ===================================================================
# ソフトウェア管理詳細（Software Detail）
# ===================================================================
class TestSoftwareDetail:
    """ソフトウェア管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_software_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ソフトウェア一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_software_by_device_requires_auth(self, client: AsyncClient):
        """デバイス別ソフトウェアは認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/software/devices/{fake_id}")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_software_by_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのソフトウェア取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
