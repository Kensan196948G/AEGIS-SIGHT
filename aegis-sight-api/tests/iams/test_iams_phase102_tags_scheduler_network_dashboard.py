"""
IAMS移植テスト: タグ管理・スケジューラ・ネットワーク/IP管理・ダッシュボード（Phase50相当）
変換元: IAMS タグ管理・スケジューラ・ネットワーク・ダッシュボードテスト 約55件中36件選定
変換日: 2026-04-02
変換元テスト数: 55件
変換テスト数: 36件（タグ定義/割当/スケジューラ/IP管理/ダッシュボード）
除外テスト数: 19件（外部スケジューラ依存・ネットワークスキャン依存・WebSocket依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# タグ管理テスト（Tags）
# ===================================================================
class TestTagsList:
    """タグ一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_tags_list_requires_auth(self, client: AsyncClient):
        """タグ一覧は認証必須であること"""
        response = await client.get("/api/v1/tags")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_tags_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_tags_list_filter_by_category(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ一覧をcategoryでフィルタリングできること"""
        response = await client.get(
            "/api/v1/tags?category=device", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_create_tag_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/tags", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグの削除は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/tags/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


class TestTagsAssignment:
    """タグ割当テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_assign_tag_requires_auth(self, client: AsyncClient):
        """タグ割当は認証必須であること"""
        response = await client.post("/api/v1/tags/assign", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_assign_tag_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タグ割当時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/tags/assign", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_assign_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグへの割当は404が返ること"""
        payload = {
            "tag_id": str(uuid.uuid4()),
            "entity_type": "device",
            "entity_id": str(uuid.uuid4()),
        }
        response = await client.post(
            "/api/v1/tags/assign", json=payload, headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unassign_tag_requires_auth(self, client: AsyncClient):
        """タグ割当解除は認証必須であること"""
        response = await client.request(
            "DELETE",
            "/api/v1/tags/assign",
            json={
                "tag_id": str(uuid.uuid4()),
                "entity_type": "device",
                "entity_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_tag_entities_nonexistent_tag_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタグのエンティティ一覧は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/tags/{fake_id}/entities", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# スケジューラテスト（Scheduler）
# ===================================================================
class TestSchedulerTasks:
    """スケジューラタスクテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_scheduler_tasks_requires_auth(self, client: AsyncClient):
        """スケジューラタスク一覧は認証必須であること"""
        response = await client.get("/api/v1/scheduler/tasks")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_scheduler_tasks_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """スケジューラタスク一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/scheduler/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_scheduler_tasks_filter_by_is_enabled(
        self, client: AsyncClient, auth_headers: dict
    ):
        """スケジューラタスクをis_enabledでフィルタリングできること"""
        response = await client.get(
            "/api/v1/scheduler/tasks?is_enabled=true", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_nonexistent_task_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの更新は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/scheduler/tasks/{fake_id}",
            json={"is_enabled": False},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_run_nonexistent_task_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないタスクの即時実行は404またはadminでない場合403が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/scheduler/tasks/{fake_id}/run",
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_task_history_requires_auth(self, client: AsyncClient):
        """タスク実行履歴は認証必須であること"""
        response = await client.get("/api/v1/scheduler/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_task_history_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """タスク実行履歴がリスト形式で返ること"""
        response = await client.get("/api/v1/scheduler/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ===================================================================
# IP管理テスト（Network/IP Management）
# ===================================================================
class TestIPRanges:
    """IPレンジ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_ranges_requires_auth(self, client: AsyncClient):
        """IPレンジ一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-ranges")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_ranges_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/ip-ranges", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_ip_ranges_filter_by_location(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジをlocationでフィルタリングできること"""
        response = await client.get(
            "/api/v1/network/ip-ranges?location=tokyo", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_ip_range_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/network/ip-ranges", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_ip_range_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_ip_range_utilization_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの利用率は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}/utilization", headers=auth_headers
        )
        assert response.status_code == 404


class TestIPAssignments:
    """IPアサインメント管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_assignments_requires_auth(self, client: AsyncClient):
        """IPアサインメント一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_assignments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサインメント一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_ip_assignments_filter_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサインメントをstatusでフィルタリングできること"""
        response = await client.get(
            "/api/v1/network/ip-assignments?status=active", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_ip_conflicts_requires_auth(self, client: AsyncClient):
        """IP競合検出は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments/conflicts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_conflicts_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IP競合検出がリスト形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_network_topology_requires_auth(self, client: AsyncClient):
        """ネットワークトポロジーは認証必須であること"""
        response = await client.get("/api/v1/network/topology")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_network_topology_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ネットワークトポロジーが200で返ること"""
        response = await client.get("/api/v1/network/topology", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# ダッシュボードテスト（Dashboard）
# ===================================================================
class TestDashboard:
    """ダッシュボードテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client: AsyncClient):
        """ダッシュボード統計は認証必須であること"""
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計が200で返ること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_stats_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計レスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in (
            "total_devices",
            "online_devices",
            "total_licenses",
            "compliance_rate",
            "pending_procurements",
            "active_alerts",
        ):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_dashboard_alerts_requires_auth(self, client: AsyncClient):
        """ダッシュボードアラートは認証必須であること"""
        response = await client.get("/api/v1/dashboard/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_alerts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートが200で返ること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_alerts_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートレスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "total" in data
        assert isinstance(data["alerts"], list)
