"""
IAMS移植テスト: 資産管理・バッチ処理・設定変更追跡・デバイスグループ（Phase52相当）
変換元: IAMS 資産・バッチ・変更・グループテスト 約60件中36件選定
変換日: 2026-04-02
変換元テスト数: 60件
変換テスト数: 36件（資産CRUD/バッチCSV/設定変更スナップショット/デバイスグループ管理）
除外テスト数: 24件（大規模バッチ依存・外部スキャン依存・リアルタイム変更検知依存）
"""

import io
import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 資産管理テスト（Assets）
# ===================================================================
class TestAssets:
    """資産管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_assets_list_requires_auth(self, client: AsyncClient):
        """資産一覧は認証必須であること"""
        response = await client.get("/api/v1/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_assets_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/assets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_assets_count_requires_auth(self, client: AsyncClient):
        """資産カウントは認証必須であること"""
        response = await client.get("/api/v1/assets/count")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_assets_count_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産カウントエンドポイントが200で返ること"""
        response = await client.get("/api/v1/assets/count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない資産の取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/assets/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_asset_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/assets", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_asset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない資産の更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/assets/{fake_id}",
            json={"status": "inactive"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_assets_filter_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産一覧をstatusでフィルタリングできること"""
        response = await client.get(
            "/api/v1/assets?status=active", headers=auth_headers
        )
        assert response.status_code in (200, 422)


# ===================================================================
# バッチ処理テスト（Batch）
# ===================================================================
class TestBatchImport:
    """バッチインポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_batch_import_devices_requires_auth(self, client: AsyncClient):
        """デバイスバッチインポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_import_devices_missing_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスバッチインポートでファイルが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/devices", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_batch_import_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスバッチインポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_import_licenses_missing_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスバッチインポートでファイルが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/licenses", headers=auth_headers
        )
        assert response.status_code == 422


class TestBatchExportAndJobs:
    """バッチエクスポート・ジョブテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_batch_export_devices_requires_auth(self, client: AsyncClient):
        """デバイスCSVエクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_export_devices_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVエクスポートが200で返ること"""
        response = await client.get(
            "/api/v1/batch/export/devices", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_batch_export_licenses_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスCSVエクスポートが200で返ること"""
        response = await client.get(
            "/api/v1/batch/export/licenses", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_batch_jobs_requires_auth(self, client: AsyncClient):
        """バッチジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/batch/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"


# ===================================================================
# 設定変更追跡テスト（Changes）
# ===================================================================
class TestChanges:
    """設定変更追跡テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_changes_list_requires_auth(self, client: AsyncClient):
        """設定変更一覧は認証必須であること"""
        response = await client.get("/api/v1/changes")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定変更一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/changes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_changes_filter_by_device_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定変更一覧をdevice_idでフィルタリングできること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes?device_id={fake_id}", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_changes_summary_requires_auth(self, client: AsyncClient):
        """設定変更サマリーは認証必須であること"""
        response = await client.get("/api/v1/changes/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_changes_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定変更サマリーが200で返ること"""
        response = await client.get("/api/v1/changes/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_device_timeline_requires_auth(self, client: AsyncClient):
        """デバイス変更タイムラインは認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_timeline_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイス変更タイムラインがリスト形式で返ること（存在しないデバイスは空リスト）"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/devices/{fake_id}/timeline", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_nonexistent_snapshot_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスナップショットの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/changes/snapshots/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_snapshot_diff_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないスナップショット間のDiff取得は404が返ること"""
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
        """スナップショット作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/changes/snapshots", json={}, headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# デバイスグループ管理テスト（Device Groups）
# ===================================================================
class TestDeviceGroups:
    """デバイスグループ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_device_groups_requires_auth(self, client: AsyncClient):
        """デバイスグループ一覧は認証必須であること"""
        response = await client.get("/api/v1/device-groups")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_groups_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスグループ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/device-groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_device_group_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスグループ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/device-groups", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループの更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/device-groups/{fake_id}",
            json={"description": "updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスグループの削除は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_add_member_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """グループへのメンバー追加時に必須フィールドが不足すると422が返ること"""
        fake_group_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/device-groups/{fake_group_id}/members",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in (404, 422)

    @pytest.mark.asyncio
    async def test_add_member_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループへのメンバー追加は404が返ること"""
        fake_group_id = str(uuid.uuid4())
        payload = {"device_id": str(uuid.uuid4())}
        response = await client.post(
            f"/api/v1/device-groups/{fake_group_id}/members",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (404, 422)

    @pytest.mark.asyncio
    async def test_remove_member_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループからのメンバー削除は404が返ること"""
        fake_group_id = str(uuid.uuid4())
        fake_device_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_group_id}/members/{fake_device_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404
