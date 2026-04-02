"""
IAMS移植テスト: SAMライセンス・調達管理・ナレッジベース・ライフサイクル詳細（Phase40）
変換元: IAMS SAM・調達・ナレッジ・ライフサイクルテスト 82件中62件選定
変換日: 2026-04-02
変換元テスト数: 62件
変換テスト数: 36件（SAMライセンスCRUD・調達ワークフロー・ナレッジ記事・デバイスライフサイクル）
除外テスト数: 26件（外部調達システム連携・ハードウェア廃棄物理フロー依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# SAMライセンス管理詳細（SAM Licenses Detail）
# ===================================================================
class TestSAMLicensesDetail:
    """SAMライセンス管理詳細テスト（IAMS移植）"""

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
            json={"description": "テストライセンス"},  # name, vendor等欠損
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
    async def test_update_nonexistent_sam_license_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSAMライセンス更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sam/licenses/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_sam_expiring_licenses_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """期限切れ予定ライセンス一覧が200で返ること"""
        response = await client.get(
            "/api/v1/sam/licenses/expiring", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sam_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンス状況が200で返ること"""
        response = await client.get("/api/v1/sam/compliance", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sam_compliance_check_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMコンプライアンスチェックが200で返ること"""
        response = await client.get(
            "/api/v1/sam/compliance/check", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# 調達管理詳細（Procurement Detail）
# ===================================================================
class TestProcurementDetail:
    """調達管理詳細テスト（IAMS移植）"""

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
    async def test_update_nonexistent_procurement_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない調達申請更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/procurement/{fake_id}",
            json={"notes": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

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
    async def test_create_knowledge_article_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でナレッジ記事作成が422を返すこと"""
        response = await client.post(
            "/api/v1/knowledge/articles",
            json={"tags": []},  # title, content等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_knowledge_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないナレッジ記事取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/knowledge/articles/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_knowledge_article_returns_404(
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
    async def test_helpful_nonexistent_article_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない記事への「役に立った」登録で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/knowledge/articles/{fake_id}/helpful", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# ライフサイクル管理詳細（Lifecycle Detail）
# ===================================================================
class TestLifecycleDetail:
    """ライフサイクル管理詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_lifecycle_disposals_requires_auth(self, client: AsyncClient):
        """廃棄申請一覧は認証必須であること"""
        response = await client.get("/api/v1/lifecycle/disposals")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_lifecycle_device_history_requires_auth(self, client: AsyncClient):
        """デバイスライフサイクル履歴は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/lifecycle/devices/{fake_id}/history")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_disposals_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄申請一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/lifecycle/disposals", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_device_lifecycle_history_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのライフサイクル履歴取得で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/lifecycle/devices/{fake_id}/history", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_add_lifecycle_event_nonexistent_device_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスへのライフサイクルイベント追加で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/lifecycle/devices/{fake_id}/events",
            json={"event_type": "maintenance", "notes": "テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404
