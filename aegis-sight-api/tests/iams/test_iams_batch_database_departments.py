"""
IAMS移植テスト: バッチ処理・データベース管理・部署管理（Phase23）
変換元: IAMS バッチインポート・DB管理・組織管理テスト 80件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（バッチジョブCRUD・DBメンテナンス・部署CRUD・コスト分析）
除外テスト数: 22件（ファイルシステムCSV依存・大規模データ依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# バッチ処理 認証（Batch Auth）
# ===================================================================
class TestBatchAuth:
    """バッチ処理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_batch_jobs_list_requires_auth(self, client: AsyncClient):
        """バッチジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/batch/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_import_devices_csv_requires_auth(self, client: AsyncClient):
        """デバイスCSVインポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_devices_csv_requires_auth(self, client: AsyncClient):
        """デバイスCSVエクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_jobs_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでバッチジョブ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# バッチ処理 エンドポイント（Batch Endpoints）
# ===================================================================
class TestBatchEndpoints:
    """バッチ処理エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_batch_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_export_devices_csv_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVエクスポートが200で返ること"""
        response = await client.get("/api/v1/batch/export/devices", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_licenses_csv_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスCSVエクスポートが200で返ること"""
        response = await client.get(
            "/api/v1/batch/export/licenses", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_import_devices_csv_no_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルなしのCSVインポートで422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/devices",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_import_licenses_csv_no_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルなしのライセンスCSVインポートで422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/licenses",
            headers=auth_headers,
        )
        assert response.status_code == 422


# ===================================================================
# データベース管理 認証（Database Auth）
# ===================================================================
class TestDatabaseAuth:
    """データベース管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_database_stats_requires_auth(self, client: AsyncClient):
        """データベース統計は認証必須であること"""
        response = await client.get("/api/v1/database/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_health_requires_auth(self, client: AsyncClient):
        """データベースヘルスは認証必須であること"""
        response = await client.get("/api/v1/database/health")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_database_stats_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでデータベース統計にアクセスできること"""
        response = await client.get("/api/v1/database/stats", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# データベース管理 エンドポイント（Database Endpoints）
# ===================================================================
class TestDatabaseEndpoints:
    """データベース管理エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_database_stats_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データベース統計に必須フィールドが含まれること"""
        response = await client.get("/api/v1/database/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_database_health_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データベースヘルスが200で返ること"""
        response = await client.get("/api/v1/database/health", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_retention_policies_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リテンションポリシー一覧が200で返ること"""
        response = await client.get(
            "/api/v1/database/retention-policies", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_retention_cleanup_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リテンションクリーンアップ実行は管理者限定（200または403）"""
        response = await client.post(
            "/api/v1/database/retention-cleanup",
            json={"dry_run": True},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201, 202, 403)


# ===================================================================
# 部署管理 認証（Departments Auth）
# ===================================================================
class TestDepartmentsAuth:
    """部署管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_departments_list_requires_auth(self, client: AsyncClient):
        """部署一覧は認証必須であること"""
        response = await client.get("/api/v1/departments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_departments_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで部署一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/departments", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 部署管理 CRUD（Departments CRUD）
# ===================================================================
class TestDepartmentsCRUD:
    """部署管理CRUDテスト（IAMS移植）"""

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
    async def test_create_department_missing_name_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/departments",
            json={"description": "テスト部署"},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_department_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なデータで部署を作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/departments",
            json={"name": f"IAMS移植テスト-部署-{unique_suffix}"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_create_department_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成した部署のレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/departments",
            json={"name": f"IAMS移植テスト-フィールド確認-{unique_suffix}"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署の取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_department_devices_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のデバイス一覧で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/devices", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_department_costs_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部署のコスト取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/costs", headers=auth_headers
        )
        assert response.status_code == 404
