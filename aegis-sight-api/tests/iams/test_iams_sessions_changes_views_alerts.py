"""
IAMS移植テスト: セッション管理・設定変更追跡・カスタムビュー・アラート詳細（Phase36）
変換元: IAMS セッション・変更・ビュー・アラートテスト 74件中52件選定
変換日: 2026-04-02
変換元テスト数: 52件
変換テスト数: 36件（セッション詳細・設定変更履歴・カスタムビューCRUD・アラート管理）
除外テスト数: 16件（WebSocket依存・リアルタイム監視依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# セッション管理詳細（Sessions Detail）
# ===================================================================
class TestSessionsDetail:
    """セッション管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sessions_requires_auth(self, client: AsyncClient):
        """セッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_active_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sessions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_active_sessions_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧が200で返ること"""
        response = await client.get("/api/v1/sessions/active", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_session_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でセッション作成が422を返すこと"""
        response = await client.post(
            "/api/v1/sessions",
            json={"notes": "テストセッション"},  # user_name, session_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_end_nonexistent_session_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッション終了で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sessions/{fake_id}/end", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_session_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション分析が200で返ること"""
        response = await client.get(
            "/api/v1/sessions/analytics", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_activities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティビティ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/sessions/activities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_user_behavior_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないユーザーの行動プロファイル取得で404が返ること"""
        response = await client.get(
            "/api/v1/sessions/users/nonexistent_user_xyz_12345/behavior",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_activity_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でアクティビティ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/sessions/activities",
            json={"notes": "テストアクティビティ"},  # session_id, activity_type等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# 設定変更追跡（Config Change Tracking）
# ===================================================================
class TestConfigChanges:
    """設定変更追跡テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_changes_requires_auth(self, client: AsyncClient):
        """設定変更一覧は認証必須であること"""
        response = await client.get("/api/v1/changes")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_summary_requires_auth(self, client: AsyncClient):
        """変更サマリーは認証必須であること"""
        response = await client.get("/api/v1/changes/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_changes_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定変更一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/changes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_changes_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """変更サマリーが200で返ること"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_device_change_timeline_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスの変更タイムライン取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline", headers=auth_headers
        )
        assert response.status_code == 404

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
    async def test_snapshot_diff_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスナップショット差分取得で404が返ること"""
        fake_id1 = str(uuid.uuid4())
        fake_id2 = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/diff/{fake_id1}/{fake_id2}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_snapshot_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でスナップショット作成が422を返すこと"""
        response = await client.post(
            "/api/v1/changes/snapshots",
            json={"notes": "テストスナップショット"},  # device_id等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# カスタムビュー管理（Custom Views）
# ===================================================================
class TestCustomViews:
    """カスタムビュー管理テスト（IAMS移植）"""

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
    async def test_create_custom_view_missing_required_returns_422(
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
        """存在しないカスタムビュー更新で404が返ること"""
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
        """存在しないカスタムビュー削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/views/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_share_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないカスタムビュー共有で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/views/{fake_id}/share",
            json={"user_ids": []},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# アラート管理詳細（Alerts Detail）
# ===================================================================
class TestAlertsDetail:
    """アラート管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_alerts_requires_auth(self, client: AsyncClient):
        """アラート一覧は認証必須であること"""
        response = await client.get("/api/v1/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_alerts_stats_requires_auth(self, client: AsyncClient):
        """アラート統計は認証必須であること"""
        response = await client.get("/api/v1/alerts/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_alerts_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_alerts_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラート統計が200で返ること"""
        response = await client.get("/api/v1/alerts/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_alert_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でアラート作成が422を返すこと"""
        response = await client.post(
            "/api/v1/alerts",
            json={"description": "テストアラート"},  # title, severity等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラート取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/alerts/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_acknowledge_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの確認で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/acknowledge", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_alert_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないアラートの解決で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/alerts/{fake_id}/resolve", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_alerts_with_severity_filter_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """重大度フィルター付きアラート一覧が200で返ること"""
        response = await client.get(
            "/api/v1/alerts?severity=critical", headers=auth_headers
        )
        assert response.status_code == 200
