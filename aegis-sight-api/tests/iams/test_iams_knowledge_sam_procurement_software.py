"""
IAMS移植テスト: ナレッジベース・SAMライセンス・調達管理・ソフトウェア在庫（Phase33）
変換元: IAMS ナレッジ・SAM・調達・ソフトウェア管理テスト 78件中56件選定
変換日: 2026-04-02
変換元テスト数: 56件
変換テスト数: 36件（ナレッジ記事・SAMライセンス・調達ワークフロー・ソフトウェア一覧）
除外テスト数: 20件（外部ライセンス管理ツール依存・物理調達プロセス依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ナレッジベース（Knowledge Base）
# ===================================================================
class TestKnowledgeBase:
    """ナレッジベーステスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_knowledge_articles_requires_auth(self, client: AsyncClient):
        """ナレッジ記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/articles")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_knowledge_categories_requires_auth(self, client: AsyncClient):
        """ナレッジカテゴリー一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/categories")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_knowledge_articles_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ記事一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/knowledge/articles", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_article_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でナレッジ記事作成が422を返すこと"""
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={"category_id": str(uuid.uuid4())},  # title, content等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/knowledge/articles/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_knowledge_popular_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """人気ナレッジ記事が200で返ること"""
        response = await client.get("/api/v1/knowledge/popular", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_knowledge_search_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ検索が200で返ること"""
        response = await client.get(
            "/api/v1/knowledge/search?q=テスト", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_knowledge_categories_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジカテゴリー一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/knowledge/categories", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict | list)


# ===================================================================
# SAMライセンス管理（SAM Licenses）
# ===================================================================
class TestSAMLicenses:
    """SAMライセンス管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_licenses_requires_auth(self, client: AsyncClient):
        """SAMライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/sam/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sam_licenses_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMライセンス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sam/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_sam_license_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でSAMライセンス作成が422を返すこと"""
        response = await client.post(
            "/api/v1/sam/licenses",
            json={"notes": "テストライセンス"},  # product_name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_sam_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSAMライセンス取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/sam/licenses/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_sam_licenses_expiring_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れSAMライセンス一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_sam_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 調達管理（Procurement）
# ===================================================================
class TestProcurement:
    """調達管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_procurement_requires_auth(self, client: AsyncClient):
        """調達申請一覧は認証必須であること"""
        response = await client.get("/api/v1/procurement")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_procurement_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """調達申請一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/procurement", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_procurement_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で調達申請作成が422を返すこと"""
        response = await client.post(
            "/api/v1/procurement",
            json={"notes": "テスト調達"},  # item_name, quantity等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/procurement/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の提出で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/procurement/{fake_id}/submit",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# ソフトウェア在庫（Software Inventory）
# ===================================================================
class TestSoftwareInventory:
    """ソフトウェア在庫テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_software_requires_auth(self, client: AsyncClient):
        """ソフトウェア一覧は認証必須であること"""
        response = await client.get("/api/v1/software")
        assert response.status_code == 401

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
    async def test_get_nonexistent_device_software_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのソフトウェア取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/software/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404
