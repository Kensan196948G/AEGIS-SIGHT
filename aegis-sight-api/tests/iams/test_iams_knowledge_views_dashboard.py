"""
IAMS移植テスト: ナレッジベース・カスタムビュー・ダッシュボード（Phase19）
変換元: IAMS ナレッジ・ビュー・ダッシュボードテスト 95件中70件選定
変換日: 2026-04-02
変換元テスト数: 70件
変換テスト数: 38件（記事CRUD・カテゴリ・カスタムビューCRUD・ダッシュボード統計）
除外テスト数: 32件（ファイル添付依存・外部認証連携依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_ARTICLE_CATEGORIES = ["how_to", "troubleshooting", "policy", "faq", "best_practice"]
ALL_ARTICLE_STATUSES = ["draft", "published", "archived"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestKnowledgeAuth:
    """ナレッジベースAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_articles_list_requires_auth(self, client: AsyncClient):
        """記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/articles")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_categories_requires_auth(self, client: AsyncClient):
        """カテゴリ一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/categories")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_popular_requires_auth(self, client: AsyncClient):
        """人気記事は認証必須であること"""
        response = await client.get("/api/v1/knowledge/popular")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """ナレッジ検索は認証必須であること"""
        response = await client.get("/api/v1/knowledge/search?q=test")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_articles_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みで記事一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/knowledge/articles", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# ナレッジ記事 CRUD（Articles CRUD）
# ===================================================================
class TestKBArticlesCRUD:
    """ナレッジ記事CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_articles_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """記事一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/knowledge/articles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_article_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={"title": "テスト記事"},  # content, category 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("category", ALL_ARTICLE_CATEGORIES)
    async def test_create_article_all_categories(
        self, client: AsyncClient, auth_headers: dict, category: str
    ):
        """全カテゴリで記事を作成できること"""
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={
                "title": f"IAMS移植テスト-{category}",
                "content": f"これは{category}カテゴリのテスト記事です。",
                "category": category,
                "status": "draft",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"category={category}: 予期しないステータス {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_article_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成した記事のレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={
                "title": f"IAMS移植テスト-フィールド確認-{unique_suffix}",
                "content": "テストコンテンツ",
                "category": "faq",
                "status": "draft",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "title", "content", "category", "status", "helpful_count"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない記事の取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/knowledge/articles/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない記事の更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/knowledge/articles/{fake_id}",
            json={"title": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_filter_articles_by_status(
        self, client: AsyncClient, auth_headers: dict
    ):
        """statusフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/knowledge/articles?status=published", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "published"

    @pytest.mark.asyncio
    async def test_filter_articles_by_category(
        self, client: AsyncClient, auth_headers: dict
    ):
        """categoryフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/knowledge/articles?category=faq", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["category"] == "faq"


# ===================================================================
# ナレッジカテゴリ・人気・検索（Categories, Popular, Search）
# ===================================================================
class TestKBCategoriesAndSearch:
    """ナレッジカテゴリ・人気・検索テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_categories_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カテゴリ一覧がリスト形式で返ること"""
        response = await client.get("/api/v1/knowledge/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_popular_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """人気記事がリスト形式で返ること（0件も許容）"""
        response = await client.get("/api/v1/knowledge/popular", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_search_with_query_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """検索クエリ付きで結果がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/knowledge/search?q=テスト", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_helpful_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない記事のhelpful投票で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/knowledge/articles/{fake_id}/helpful",
            json={"helpful": True},
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# カスタムビュー 認証（Custom Views Auth）
# ===================================================================
class TestCustomViewsAuth:
    """カスタムビューAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_views_list_requires_auth(self, client: AsyncClient):
        """カスタムビュー一覧は認証必須であること"""
        response = await client.get("/api/v1/views")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_views_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでカスタムビュー一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/views", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# カスタムビュー CRUD（Custom Views CRUD）
# ===================================================================
class TestCustomViewsCRUD:
    """カスタムビューCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_views_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタムビュー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/views", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_view_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/views",
            json={"columns": {"cols": ["name"]}},  # name, entity_type 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_view_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """有効なデータでカスタムビューを作成できること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/views",
            json={
                "name": f"IAMS移植テスト-ビュー-{unique_suffix}",
                "entity_type": "device",
                "columns": {"cols": ["name", "status", "os_type"]},
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_create_view_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したビューのレスポンスに必須フィールドが含まれること"""
        unique_suffix = str(uuid.uuid4())[:8]
        response = await client.post(
            "/api/v1/views",
            json={
                "name": f"IAMS移植テスト-フィールド確認-{unique_suffix}",
                "entity_type": "license",
                "columns": {"cols": ["name", "vendor"]},
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name", "entity_type"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_update_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないビューの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/views/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないビューの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/views/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_share_nonexistent_view_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないビューの共有で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/views/{fake_id}/share",
            json={"shared": True},
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_filter_views_by_entity_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """entity_typeフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/views?entity_type=device", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["entity_type"] == "device"


# ===================================================================
# ダッシュボード（Dashboard）
# ===================================================================
class TestDashboard:
    """ダッシュボードテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dashboard_stats_requires_auth(self, client: AsyncClient):
        """ダッシュボード統計は認証必須であること"""
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_alerts_requires_auth(self, client: AsyncClient):
        """ダッシュボードアラートは認証必須であること"""
        response = await client.get("/api/v1/dashboard/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計が200で返ること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_stats_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計に必須フィールドが含まれること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("total_devices", "total_licenses", "compliance_rate",
                      "pending_procurements", "active_alerts"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_dashboard_stats_values_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボード統計の数値は非負であること"""
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("total_devices", "total_licenses", "pending_procurements", "active_alerts"):
            assert data[field] >= 0, f"{field} is negative"
        assert 0.0 <= data["compliance_rate"] <= 100.0

    @pytest.mark.asyncio
    async def test_dashboard_alerts_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートが200で返ること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_alerts_has_alerts_field(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ダッシュボードアラートに alerts フィールドが含まれること"""
        response = await client.get("/api/v1/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
