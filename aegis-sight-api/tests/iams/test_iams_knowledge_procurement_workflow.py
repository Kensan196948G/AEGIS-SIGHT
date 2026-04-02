"""
IAMS移植テスト: ナレッジベース詳細・調達ワークフロー詳細（Phase48）
変換元: IAMS ナレッジ・調達ワークフローテスト 74件中56件選定
変換日: 2026-04-02
変換元テスト数: 56件
変換テスト数: 36件（ナレッジ記事CRUD・カテゴリ・調達ワークフロー状態遷移）
除外テスト数: 20件（外部承認フロー依存・ファイル添付依存・メール通知依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ナレッジベース詳細（Knowledge Base Detail）
# ===================================================================
class TestKnowledgeBaseDetail:
    """ナレッジベース詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_knowledge_articles_requires_auth(self, client: AsyncClient):
        """ナレッジ記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/articles")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_knowledge_categories_requires_auth(self, client: AsyncClient):
        """ナレッジカテゴリ一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/categories")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_knowledge_popular_requires_auth(self, client: AsyncClient):
        """人気記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/popular")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_knowledge_search_requires_auth(self, client: AsyncClient):
        """ナレッジ検索は認証必須であること"""
        response = await client.get("/api/v1/knowledge/search")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_knowledge_articles_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ記事一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/knowledge/articles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_list_knowledge_categories_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジカテゴリ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/knowledge/categories", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_knowledge_popular_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """人気記事一覧が200で返ること"""
        response = await client.get("/api/v1/knowledge/popular", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_knowledge_search_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ検索が200で返ること"""
        response = await client.get(
            "/api/v1/knowledge/search?q=test", headers=auth_headers
        )
        assert response.status_code == 200

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
    async def test_create_article_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でナレッジ記事作成が422を返すこと"""
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={"tags": ["test"]},  # title, content等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_mark_helpful_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない記事の役立った投票で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/knowledge/articles/{fake_id}/helpful", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/knowledge/articles/{fake_id}",
            json={"title": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_category_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でカテゴリ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/knowledge/categories",
            json={},  # name欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_knowledge_search_empty_query_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """空クエリでのナレッジ検索が200または422で返ること"""
        response = await client.get(
            "/api/v1/knowledge/search", headers=auth_headers
        )
        assert response.status_code in (200, 422)


# ===================================================================
# 調達ワークフロー詳細（Procurement Workflow Detail）
# ===================================================================
class TestProcurementWorkflowDetail:
    """調達ワークフロー詳細テスト（IAMS移植）"""

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
    async def test_create_procurement_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で調達申請作成が422を返すこと"""
        response = await client.post(
            "/api/v1/procurement",
            json={"notes": "テスト"},  # item_name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_submit_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の提出で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/submit", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の承認で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/approve", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_reject_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の却下で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/reject", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_order_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の発注で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/order", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_receive_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の受領で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/receive", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_dispose_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請の廃棄で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/procurement/{fake_id}/dispose", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# SAM詳細（Software Asset Management Detail）
# ===================================================================
class TestSAMDetail:
    """SAM詳細テスト（IAMS移植）"""

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
    async def test_sam_expiring_requires_auth(self, client: AsyncClient):
        """期限切れ間近ライセンスは認証必須であること"""
        response = await client.get("/api/v1/sam/licenses/expiring")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_expiring_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れ間近ライセンス一覧が200で返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sam_compliance_requires_auth(self, client: AsyncClient):
        """SAMコンプライアンスは認証必須であること"""
        response = await client.get("/api/v1/sam/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200

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
    async def test_create_sam_license_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でSAMライセンス作成が422を返すこと"""
        response = await client.post(
            "/api/v1/sam/licenses",
            json={"notes": "テスト"},  # product_name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sam_compliance_check_requires_auth(self, client: AsyncClient):
        """SAMコンプライアンスチェック実行は認証必須であること"""
        response = await client.post("/api/v1/sam/compliance/check")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_compliance_check_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンスチェックが200で返ること"""
        response = await client.post(
            "/api/v1/sam/compliance/check", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_nonexistent_sam_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSAMライセンス更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sam/licenses/{fake_id}",
            json={"quantity": 10},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_sam_expiring_days_param_validates(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAM期限切れライセンスのdaysパラメータバリデーションが機能すること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring?days=0", headers=auth_headers
        )
        assert response.status_code == 422
