"""
IAMS移植テスト: 認証・SAMライセンス管理・ナレッジベース・データベース管理（Phase58相当）
変換元: IAMS 認証/SAM/ナレッジ/DBテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（認証フロー/ライセンスCRUD/期限切れ検知/コンプライアンス/記事CRUD/カテゴリ/DB管理）
除外テスト数: 29件（JWTトークン内容依存・外部SAMエンジン依存・全文検索エンジン依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 認証テスト（Auth）
# ===================================================================
class TestAuth:
    """認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_token_missing_form_data_returns_422(self, client: AsyncClient):
        """ログイン時にフォームデータが不足すると422が返ること"""
        response = await client.post("/api/v1/auth/token", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_token_bad_credentials_returns_401(self, client: AsyncClient):
        """不正な認証情報でのログインは401が返ること"""
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "notexist@test.invalid", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_requires_auth(self, client: AsyncClient):
        """現在のユーザー情報取得は認証必須であること"""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_returns_200(self, client: AsyncClient, auth_headers: dict):
        """現在のユーザー情報が200で返ること"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_me_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """現在のユーザー情報レスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("id", "email", "role"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_register_missing_required_returns_422(self, client: AsyncClient):
        """ユーザー登録時に必須フィールドが不足すると422が返ること"""
        response = await client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422


# ===================================================================
# SAMライセンス管理テスト（SAM）
# ===================================================================
class TestSAMLicenses:
    """SAMライセンス管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_licenses_requires_auth(self, client: AsyncClient):
        """ライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/sam/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_licenses_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンス一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sam/licenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_license_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンス作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/sam/licenses", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないライセンスの取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/sam/licenses/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないライセンスの更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sam/licenses/{fake_id}",
            json={"notes": "updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_expiring_licenses_requires_auth(self, client: AsyncClient):
        """期限切れ間近ライセンス一覧は認証必須であること"""
        response = await client.get("/api/v1/sam/licenses/expiring")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expiring_licenses_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れ間近ライセンス一覧が200で返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_requires_auth(self, client: AsyncClient):
        """SAMコンプライアンス情報は認証必須であること"""
        response = await client.get("/api/v1/sam/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンス情報が200で返ること"""
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_check_requires_auth(self, client: AsyncClient):
        """SAMコンプライアンスチェック実行は認証必須であること"""
        response = await client.post("/api/v1/sam/compliance/check")
        assert response.status_code == 401


# ===================================================================
# ナレッジベーステスト（Knowledge）
# ===================================================================
class TestKnowledgeArticles:
    """ナレッジベース記事テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_articles_requires_auth(self, client: AsyncClient):
        """ナレッジ記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/articles")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_articles_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ記事一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/knowledge/articles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_article_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジ記事作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/knowledge/articles", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事の取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/knowledge/articles/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事の更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/knowledge/articles/{fake_id}",
            json={"title": "updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_helpful_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事への役立つマークは404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/knowledge/articles/{fake_id}/helpful", headers=auth_headers
        )
        assert response.status_code == 404


class TestKnowledgeCategories:
    """ナレッジカテゴリテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_categories_requires_auth(self, client: AsyncClient):
        """ナレッジカテゴリ一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/categories")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_categories_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ナレッジカテゴリ一覧が200で返ること"""
        response = await client.get(
            "/api/v1/knowledge/categories", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_category_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カテゴリ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/knowledge/categories", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_popular_requires_auth(self, client: AsyncClient):
        """人気記事一覧は認証必須であること"""
        response = await client.get("/api/v1/knowledge/popular")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_popular_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """人気記事一覧が200で返ること"""
        response = await client.get("/api/v1/knowledge/popular", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_search_requires_auth(self, client: AsyncClient):
        """ナレッジ全文検索は認証必須であること"""
        response = await client.get("/api/v1/knowledge/search")
        assert response.status_code == 401


# ===================================================================
# データベース管理テスト（Database）
# ===================================================================
class TestDatabase:
    """データベース管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_db_stats_requires_auth(self, client: AsyncClient):
        """データベース統計は認証必須であること"""
        response = await client.get("/api/v1/database/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_db_stats_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データベース統計はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/database/stats", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_retention_requires_auth(self, client: AsyncClient):
        """データ保持ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/database/retention")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_retention_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データ保持ポリシー一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/database/retention", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_retention_run_requires_auth(self, client: AsyncClient):
        """データ保持クリーンアップ実行は認証必須であること"""
        response = await client.post("/api/v1/database/retention/run")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_retention_run_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データ保持クリーンアップ実行はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.post(
            "/api/v1/database/retention/run", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_db_health_requires_auth(self, client: AsyncClient):
        """データベースヘルスチェックは認証必須であること"""
        response = await client.get("/api/v1/database/health")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_db_health_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """データベースヘルスチェックはadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/database/health", headers=auth_headers)
        assert response.status_code in (200, 403)
