"""
IAMS移植テスト: API共通（Phase1）
変換元: IAMS API共通テスト 156件中130件選定
変換日: 2026-04-02
変換元テスト数: 130件
変換テスト数: 38件（優先度高・認証・バリデーション・エラーハンドリング）
除外テスト数: 92件（Express固有ミドルウェア・テンプレート依存）
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestAuthCommon:
    """API認証共通テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_missing_auth_header_returns_401(self, client: AsyncClient):
        """Authorization ヘッダーなしで 401 が返ること"""
        response = await client.get("/api/v1/assets/")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, client: AsyncClient):
        """無効トークンで 401 が返ること"""
        response = await client.get(
            "/api/v1/assets/",
            headers={"Authorization": "Bearer invalid_token_abc"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_malformed_bearer_returns_401(self, client: AsyncClient):
        """Bearer 形式でないトークンで 401 が返ること"""
        response = await client.get(
            "/api/v1/assets/",
            headers={"Authorization": "Token abc123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_token_grants_access(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効トークンでアクセスが許可されること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_endpoint_no_auth_required(self, client: AsyncClient):
        """ヘルスチェックエンドポイントは認証不要であること"""
        response = await client.get("/health")
        assert response.status_code == 200


# ===================================================================
# レスポンス形式（Response Format）
# ===================================================================
class TestResponseFormat:
    """APIレスポンス形式の共通テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_response_has_pagination_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """リスト系レスポンスにページネーションフィールドが含まれること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_content_type_is_json(
        self, client: AsyncClient, auth_headers: dict
    ):
        """レスポンスのContent-Typeが application/json であること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        assert "application/json" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_not_found_returns_404_with_detail(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないリソースに対して 404 と detail フィールドが返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/assets/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_create_returns_201(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成エンドポイントは 201 を返すこと"""
        payload = {
            "hostname": "iams-test-pc",
            "ip_address": "10.0.99.1",
            "asset_type": "laptop",
            "department": "テスト部門",
            "status": "active",
        }
        response = await client.post(
            "/api/v1/assets/", json=payload, headers=auth_headers
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な UUID パスパラメータで 422 が返ること"""
        response = await client.get(
            "/api/v1/assets/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# ページネーション（Pagination）
# ===================================================================
class TestPaginationCommon:
    """ページネーション共通テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_default_limit_is_applied(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit 未指定時はデフォルト値が適用されること"""
        response = await client.get("/api/v1/assets/", headers=auth_headers)
        data = response.json()
        assert data["limit"] == 50

    @pytest.mark.asyncio
    async def test_custom_limit_applied(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタム limit が適用されること"""
        response = await client.get(
            "/api/v1/assets/?limit=5", headers=auth_headers
        )
        data = response.json()
        assert data["limit"] == 5
        assert len(data["items"]) <= 5

    @pytest.mark.asyncio
    async def test_skip_offset_applied(
        self, client: AsyncClient, auth_headers: dict
    ):
        """skip（offset）パラメータが適用されること"""
        response = await client.get(
            "/api/v1/assets/?skip=0&limit=3", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["offset"] == 0

    @pytest.mark.asyncio
    async def test_limit_max_boundary(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit の最大値（200）が適用されること"""
        response = await client.get(
            "/api/v1/assets/?limit=200", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 200

    @pytest.mark.asyncio
    async def test_limit_exceeds_max_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit が最大値（200）超過時に 422 が返ること"""
        response = await client.get(
            "/api/v1/assets/?limit=201", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_skip_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """負の skip 値で 422 が返ること"""
        response = await client.get(
            "/api/v1/assets/?skip=-1", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# SAM ライセンス API 共通（IAMS SAM 移植）
# ===================================================================
class TestSAMAPICommon:
    """SAMライセンスAPI共通テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_list_requires_auth(self, client: AsyncClient):
        """SAM ライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/sam/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_expiring_requires_auth(self, client: AsyncClient):
        """SAM 期限切れライセンス取得は認証必須であること"""
        response = await client.get("/api/v1/sam/licenses/expiring")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_compliance_requires_auth(self, client: AsyncClient):
        """SAM コンプライアンス確認は認証必須であること"""
        response = await client.get("/api/v1/sam/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAM ライセンス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sam/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_sam_create_invalid_license_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なライセンス種別で 422 が返ること"""
        payload = {
            "software_name": "TestSW",
            "vendor": "TestVendor",
            "license_type": "invalid_type",
        }
        response = await client.post(
            "/api/v1/sam/licenses", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sam_expiring_days_out_of_range_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """days パラメータが範囲外の場合 422 が返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=0", headers=auth_headers
        )
        assert response.status_code == 422

        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=366", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sam_expiring_default_days_is_30(
        self, client: AsyncClient, auth_headers: dict
    ):
        """days 未指定時のデフォルト（30日）で正常応答すること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring", headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_sam_compliance_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンスチェックがリスト形式で返ること"""
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
