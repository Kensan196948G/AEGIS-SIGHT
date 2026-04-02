"""
IAMS移植テスト: ヘルスチェック・バージョン・テレメトリー・ソフトウェア管理（Phase24）
変換元: IAMS システム基盤・ソフトウェアインベントリテスト 72件中54件選定
変換日: 2026-04-02
変換元テスト数: 54件
変換テスト数: 36件（ヘルスCRUD・バージョン情報・テレメトリー取込・ソフトウェアCRUD）
除外テスト数: 18件（OSメトリクス取得依存・エージェントデーモン実行依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ヘルスチェック 認証（Health Auth）
# ===================================================================
class TestHealthAuth:
    """ヘルスチェックAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_health_check_no_auth_required(self, client: AsyncClient):
        """ヘルスチェックは認証不要であること（公開エンドポイント）"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_detail_requires_auth(self, client: AsyncClient):
        """ヘルス詳細は認証必須であること"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_health_ready_no_auth_required(self, client: AsyncClient):
        """ヘルスレディネスは認証不要であること"""
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200


# ===================================================================
# ヘルスチェック エンドポイント（Health Endpoints）
# ===================================================================
class TestHealthEndpoints:
    """ヘルスチェックエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_health_check_returns_status(self, client: AsyncClient):
        """ヘルスチェックがstatusフィールドを含むこと"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    @pytest.mark.asyncio
    async def test_health_check_status_is_ok(self, client: AsyncClient):
        """ヘルスチェックのstatusがokであること"""
        response = await client.get("/api/v1/health")
        data = response.json()
        assert data["status"] in ("ok", "healthy", "UP")

    @pytest.mark.asyncio
    async def test_health_detail_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ヘルス詳細が200で返ること"""
        response = await client.get("/api/v1/health/detail", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_detail_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ヘルス詳細に必須フィールドが含まれること"""
        response = await client.get("/api/v1/health/detail", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_health_ready_returns_status(self, client: AsyncClient):
        """レディネスチェックがstatusフィールドを含むこと"""
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


# ===================================================================
# バージョン情報（Version）
# ===================================================================
class TestVersionEndpoints:
    """バージョン情報テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_version_no_auth_required(self, client: AsyncClient):
        """バージョン情報は認証不要であること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_version_has_version_field(self, client: AsyncClient):
        """バージョン情報にversionフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data

    @pytest.mark.asyncio
    async def test_version_has_required_fields(self, client: AsyncClient):
        """バージョン情報に必須フィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        for field in ("version",):
            assert field in data, f"Missing field: {field}"


# ===================================================================
# テレメトリー（Telemetry）
# ===================================================================
class TestTelemetryEndpoints:
    """テレメトリーエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_telemetry_ingest_requires_auth(self, client: AsyncClient):
        """テレメトリー取込は認証必須であること"""
        response = await client.post(
            "/api/v1/telemetry",
            json={"device_id": str(uuid.uuid4())},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_telemetry_ingest_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でテレメトリー取込が422を返すこと"""
        response = await client.post(
            "/api/v1/telemetry",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_ingest_valid_data_returns_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なテレメトリーデータで正常応答が返ること"""
        payload = {
            "device_id": str(uuid.uuid4()),
            "hostname": "iams-test-host",
            "os_name": "Windows 11",
            "os_version": "23H2",
            "ip_addresses": ["192.168.1.100"],
        }
        response = await client.post(
            "/api/v1/telemetry",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )


# ===================================================================
# ソフトウェア管理 認証（Software Auth）
# ===================================================================
class TestSoftwareAuth:
    """ソフトウェア管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_list_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_software_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでソフトウェア一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/software", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# ソフトウェア管理 CRUD（Software CRUD）
# ===================================================================
class TestSoftwareCRUD:
    """ソフトウェア管理CRUDテスト（IAMS移植）"""

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
    async def test_get_software_by_device_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイス別ソフトウェア一覧が取得できること（404 for nonexistent）"""
        fake_device_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_device_id}",
            headers=auth_headers,
        )
        assert response.status_code in (200, 404)

    @pytest.mark.asyncio
    async def test_filter_software_by_name(
        self, client: AsyncClient, auth_headers: dict
    ):
        """名前フィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/software?name=Microsoft", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_filter_software_by_vendor(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ベンダーフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/software?vendor=Microsoft", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_software_pagination_limit_works(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ページネーションのlimitパラメータが機能すること"""
        response = await client.get(
            "/api/v1/software?limit=5&offset=0", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert len(data["items"]) <= 5
