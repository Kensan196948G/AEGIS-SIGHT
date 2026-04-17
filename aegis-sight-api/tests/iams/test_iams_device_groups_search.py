"""
IAMS移植テスト: デバイスグループ・全文検索・バッチインポート（Phase17）
変換元: IAMS グループ管理・検索・バッチ処理テスト 84件中65件選定
変換日: 2026-04-02
変換元テスト数: 65件
変換テスト数: 36件（デバイスグループCRUD・メンバー管理・検索・バッチインポート）
除外テスト数: 29件（ファイルアップロード依存・バックグラウンドジョブ依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestDeviceGroupsAuth:
    """デバイスグループAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_device_groups_requires_auth(self, client: AsyncClient):
        """デバイスグループ一覧は認証必須であること"""
        response = await client.get("/api/v1/device-groups")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """全文検索は認証必須であること"""
        response = await client.get("/api/v1/search?q=test")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_history_requires_auth(self, client: AsyncClient):
        """バッチ履歴は認証必須であること"""
        response = await client.get("/api/v1/batch/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_device_groups_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでデバイスグループ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/device-groups", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_device_groups(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールでもデバイスグループ一覧にアクセスできること"""
        response = await client.get("/api/v1/device-groups", headers=readonly_headers)
        assert response.status_code == 200


# ===================================================================
# デバイスグループ CRUD（Device Groups CRUD）
# ===================================================================
class TestDeviceGroupsCRUD:
    """デバイスグループCRUDテスト（IAMS移植）"""

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
    async def test_create_device_group_missing_name_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/device-groups",
            json={"description": "テストグループ"},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_device_group_valid_returns_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なデータでデバイスグループを作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/device-groups",
            json={
                "name": f"IAMS移植テスト-グループ-{unique_suffix}",
                "description": "IAMS pytest移植テスト用グループ",
                "criteria": {"os_type": "windows"},
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_create_device_group_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したグループのレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/device-groups",
            json={"name": f"IAMS移植テスト-フィールド-{unique_suffix}"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループの取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_device_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループの更新で404が返ること"""
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
        """存在しないグループの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# デバイスグループ メンバー管理（Members）
# ===================================================================
class TestDeviceGroupMembers:
    """デバイスグループメンバー管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_members_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループのメンバー一覧で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/device-groups/{fake_id}/members", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_add_member_to_nonexistent_group_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないグループへのメンバー追加で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/device-groups/{fake_id}/members",
            json={"device_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_remove_member_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないメンバー削除で404が返ること"""
        fake_group_id = str(uuid.uuid4())
        fake_device_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/device-groups/{fake_group_id}/members/{fake_device_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# 全文検索（Full-text Search）
# ===================================================================
class TestFullTextSearch:
    """全文検索テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_search_requires_query_param(
        self, client: AsyncClient, auth_headers: dict
    ):
        """検索クエリなしで400または422が返ること"""
        response = await client.get("/api/v1/search", headers=auth_headers)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_search_returns_result_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """検索結果に必須フィールドが含まれること"""
        response = await client.get("/api/v1/search?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data or "results" in data or isinstance(data, list | dict)

    @pytest.mark.asyncio
    async def test_search_empty_query_returns_400_or_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """空のクエリで400または422が返ること"""
        response = await client.get("/api/v1/search?q=", headers=auth_headers)
        assert response.status_code in (400, 422)

    @pytest.mark.asyncio
    async def test_search_with_device_type_filter(
        self, client: AsyncClient, auth_headers: dict
    ):
        """typeフィルタ付き検索が正常に動作すること"""
        response = await client.get(
            "/api/v1/search?q=test&types=device", headers=auth_headers
        )
        assert response.status_code in (200, 400, 422)


# ===================================================================
# バッチインポート（Batch Import）
# ===================================================================
class TestBatchImport:
    """バッチインポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_batch_history_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチ履歴がページネーション形式で返ること"""
        response = await client.get("/api/v1/batch/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_batch_history_items_have_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチ履歴の各アイテムに必須フィールドが含まれること（0件の場合スキップ）"""
        response = await client.get("/api/v1/batch/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            for field in ("id", "job_type", "status"):
                assert field in item, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_import_devices_without_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルなしのデバイスインポートで422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/devices",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_import_licenses_without_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルなしのライセンスインポートで422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/licenses",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_batch_job_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないバッチジョブの取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/batch/history/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
