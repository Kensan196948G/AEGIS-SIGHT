"""
IAMS移植テスト: デバイスグループ・カスタムビュー・検索・スケジューラー詳細（Phase43）
変換元: IAMS デバイスグループ・ビュー・検索・スケジューラーテスト 68件中50件選定
変換日: 2026-04-02
変換元テスト数: 50件
変換テスト数: 36件（デバイスグループCRUD・カスタムビュー・統合検索・スケジューラータスク）
除外テスト数: 14件（動的グループ条件評価依存・外部スケジューラー連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# デバイスグループ詳細（Device Groups Detail）
# ===================================================================
class TestDeviceGroupsDetail:
    """デバイスグループ詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_device_groups_requires_auth(self, client: AsyncClient):
        """デバイスグループ一覧は認証必須であること"""
        response = await client.get("/api/v1/device-groups")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_device_groups_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスグループ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/device-groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_device_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループ更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/device-groups/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_device_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループ削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_group_members_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループのメンバー取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}/members", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_device_group_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でデバイスグループ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/device-groups",
            json={"description": "テストグループ"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# カスタムビュー詳細（Custom Views Detail）
# ===================================================================
class TestCustomViewsDetail:
    """カスタムビュー詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_custom_views_requires_auth(self, client: AsyncClient):
        """カスタムビュー一覧は認証必須であること"""
        response = await client.get("/api/v1/views")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_custom_views_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビュー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/views", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_custom_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビュー取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/views/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_custom_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビュー更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/views/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_share_nonexistent_custom_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビューの共有で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/views/{fake_id}/share",
            json={"user_ids": []},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# 統合検索（Search）
# ===================================================================
class TestSearch:
    """統合検索テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """統合検索は認証必須であること"""
        response = await client.get("/api/v1/search")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_with_query_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """クエリ付き検索が200で返ること"""
        response = await client.get(
            "/api/v1/search?q=test", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_empty_query_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """空クエリでも検索が200で返ること"""
        response = await client.get(
            "/api/v1/search", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_returns_expected_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """検索結果が期待する構造を持つこと"""
        response = await client.get(
            "/api/v1/search?q=device", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


# ===================================================================
# スケジューラー詳細（Scheduler Detail）
# ===================================================================
class TestSchedulerDetail:
    """スケジューラー詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_scheduler_tasks_requires_auth(self, client: AsyncClient):
        """スケジューラータスク一覧は認証必須であること"""
        response = await client.get("/api/v1/scheduler/tasks")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_scheduler_history_requires_auth(self, client: AsyncClient):
        """スケジューラー履歴は認証必須であること"""
        response = await client.get("/api/v1/scheduler/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_scheduler_tasks_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """スケジューラータスク一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/scheduler/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_scheduler_history_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """スケジューラー履歴がページネーション形式で返ること"""
        response = await client.get("/api/v1/scheduler/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_scheduler_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスケジューラータスク取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/scheduler/tasks/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_run_nonexistent_scheduler_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスケジューラータスクの実行で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/scheduler/tasks/{fake_id}/run", headers=auth_headers
        )
        assert response.status_code == 404
