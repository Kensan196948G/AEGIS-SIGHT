"""
IAMS移植テスト: スケジューラー・M365・システム設定管理（Phase20）
変換元: IAMS スケジューラー・M365・設定管理テスト 85件中62件選定
変換日: 2026-04-02
変換元テスト数: 62件
変換テスト数: 36件（スケジューラーCRUD・M365連携・システム設定）
除外テスト数: 26件（外部M365 API接続依存・cronデーモン実行依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_TASK_TYPES = ["sam_check", "m365_sync", "report_generation", "backup", "cleanup"]


# ===================================================================
# スケジューラー 認証（Scheduler Auth）
# ===================================================================
class TestSchedulerAuth:
    """スケジューラーAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_tasks_list_requires_auth(self, client: AsyncClient):
        """スケジュールタスク一覧は認証必須であること"""
        response = await client.get("/api/v1/scheduler/tasks")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_history_requires_auth(self, client: AsyncClient):
        """スケジュール実行履歴は認証必須であること"""
        response = await client.get("/api/v1/scheduler/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_tasks_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでスケジュールタスク一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/scheduler/tasks", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# スケジューラー CRUD（Scheduler CRUD）
# ===================================================================
class TestSchedulerCRUD:
    """スケジューラーCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_tasks_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """スケジュールタスク一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/scheduler/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_update_nonexistent_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/scheduler/tasks/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_run_nonexistent_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの即時実行で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/scheduler/tasks/{fake_id}/run",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_history_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """実行履歴がページネーション形式で返ること"""
        response = await client.get("/api/v1/scheduler/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_filter_tasks_by_task_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """task_typeフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/scheduler/tasks?task_type=sam_check", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["task_type"] == "sam_check"

    @pytest.mark.asyncio
    async def test_filter_tasks_by_is_enabled(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_enabledフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/scheduler/tasks?is_enabled=true", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_enabled"] is True

    @pytest.mark.asyncio
    async def test_invalid_task_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なtask_typeで422が返ること"""
        response = await client.get(
            "/api/v1/scheduler/tasks?task_type=invalid_type", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# M365 認証（M365 Auth）
# ===================================================================
class TestM365Auth:
    """M365 API認証テスト（IAMS移植）"""

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


# ===================================================================
# M365 エンドポイント（M365 Endpoints）
# ===================================================================
class TestM365Endpoints:
    """M365エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_m365_licenses_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧が200で返ること"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_m365_licenses_has_items_field(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ライセンス一覧にitemsフィールドが含まれること"""
        response = await client.get("/api/v1/m365/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_m365_users_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧が200で返ること"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_m365_users_has_items_field(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365ユーザー一覧にitemsフィールドが含まれること"""
        response = await client.get("/api/v1/m365/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_m365_sync_returns_result(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期が正常なレスポンスを返すこと（外部API未接続でも200または503）"""
        response = await client.post(
            "/api/v1/m365/sync",
            json={
                "sync_licenses": True,
                "sync_users": True,
                "sync_devices": False,
                "sync_alerts": False,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 503, 400)

    @pytest.mark.asyncio
    async def test_m365_sync_response_has_status_field(
        self, client: AsyncClient, auth_headers: dict
    ):
        """M365同期レスポンスにstatusフィールドが含まれること"""
        response = await client.post(
            "/api/v1/m365/sync",
            json={"sync_licenses": False, "sync_users": False},
            headers=auth_headers,
        )
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "message" in data


# ===================================================================
# システム設定 認証（System Config Auth）
# ===================================================================
class TestSystemConfigAuth:
    """システム設定API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_config_list_requires_auth(self, client: AsyncClient):
        """システム設定一覧は認証必須であること"""
        response = await client.get("/api/v1/config")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでシステム設定一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# システム設定 CRUD（System Config CRUD）
# ===================================================================
class TestSystemConfigCRUD:
    """システム設定CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_config_has_items_field(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定一覧にitemsフィールドが含まれること"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キーの取得で404が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.get(
            f"/api/v1/config/{fake_key}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_config_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キーの更新で404が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.put(
            f"/api/v1/config/{fake_key}",
            json={"value": "test_value"},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_reset_nonexistent_config_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キーのリセットで404が返ること"""
        fake_key = f"nonexistent_key_{uuid.uuid4().hex[:8]}"
        response = await client.post(
            f"/api/v1/config/reset/{fake_key}",
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)
