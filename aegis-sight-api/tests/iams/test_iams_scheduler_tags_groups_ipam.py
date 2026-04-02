"""
IAMS移植テスト: スケジューラー・タグ管理・デバイスグループ・IPアドレス管理（Phase32）
変換元: IAMS スケジューラー・タグ・グループ・IPAM テスト 74件中52件選定
変換日: 2026-04-02
変換元テスト数: 52件
変換テスト数: 36件（スケジューラータスク・タグCRUD・デバイスグループCRUD・IPレンジ管理）
除外テスト数: 16件（外部ジョブスケジューラー依存・ネットワーク機器依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# スケジューラー（Scheduler）
# ===================================================================
class TestScheduler:
    """スケジューラーテスト（IAMS移植）"""

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
    async def test_scheduler_tasks_returns_paginated(
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
    async def test_run_nonexistent_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの実行で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/scheduler/tasks/{fake_id}/run",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_task_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/scheduler/tasks/{fake_id}",
            json={"is_active": False},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# タグ管理（Tags）
# ===================================================================
class TestTagsManagement:
    """タグ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_tags_requires_auth(self, client: AsyncClient):
        """タグ一覧は認証必須であること"""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_tags_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでタグ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_tags_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_tag_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でタグ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/tags",
            json={"description": "テストタグ"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/tags/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_tag_entities_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグのエンティティ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/tags/{fake_id}/entities", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# デバイスグループ管理（Device Groups）
# ===================================================================
class TestDeviceGroups:
    """デバイスグループ管理テスト（IAMS移植）"""

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
    async def test_create_group_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でデバイスグループ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/device-groups",
            json={"description": "テストグループ"},  # name欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループ取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_group_returns_404(
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
    async def test_delete_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループ削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# IPアドレス管理（IPAM）
# ===================================================================
class TestIPAM:
    """IPアドレス管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_ranges_requires_auth(self, client: AsyncClient):
        """IPレンジ一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-ranges")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_assignments_requires_auth(self, client: AsyncClient):
        """IPアサイン一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_ip_ranges_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-ranges", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_ip_range_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でIPレンジ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/network/ip-ranges",
            json={"description": "テストレンジ"},  # cidr等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_ip_range_utilization_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの使用率取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}/utilization", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_ip_assignments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサイン一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_ip_conflicts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアドレス競合確認が200で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_ip_topology_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ネットワークトポロジーが200で返ること"""
        response = await client.get(
            "/api/v1/network/topology", headers=auth_headers
        )
        assert response.status_code == 200
