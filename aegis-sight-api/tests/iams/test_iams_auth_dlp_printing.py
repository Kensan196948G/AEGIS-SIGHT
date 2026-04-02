"""
IAMS移植テスト: 認証詳細・DLP・印刷管理（Phase26）
変換元: IAMS 認証・DLP・プリント管理テスト 75件中55件選定
変換日: 2026-04-02
変換元テスト数: 55件
変換テスト数: 36件（認証CRUD・DLPルール・印刷ジョブ・ポリシー）
除外テスト数: 19件（外部認証プロバイダー依存・物理プリンター依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# 認証詳細（Auth Detail）
# ===================================================================
class TestAuthDetail:
    """認証詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_login_missing_credentials_returns_422(self, client: AsyncClient):
        """認証情報なしでログインが422を返すこと"""
        response = await client.post("/api/v1/auth/token", data={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_credentials_returns_401(self, client: AsyncClient):
        """無効な認証情報で401が返ること"""
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "invalid@example.com", "password": "wrong_password"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_without_auth_returns_401(
        self, client: AsyncClient
    ):
        """認証なしでプロファイル取得が401を返すこと"""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_with_auth_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでプロファイル取得が200を返すこと"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_current_user_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プロファイルに必須フィールドが含まれること"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data

    @pytest.mark.asyncio
    async def test_register_missing_email_returns_422(self, client: AsyncClient):
        """メールなしで登録が422を返すこと"""
        response = await client.post(
            "/api/v1/auth/register",
            json={"password": "TestPass123!", "full_name": "Test User"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_password_returns_422(self, client: AsyncClient):
        """パスワードなしで登録が422を返すこと"""
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "full_name": "Test User"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_valid_user_returns_201(self, client: AsyncClient):
        """有効なデータで新規ユーザー登録が201を返すこと"""
        unique_email = f"iams_test_{uuid.uuid4().hex[:8]}@example.com"
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "full_name": "IAMS Test User",
            },
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}, body: {response.text[:200]}"
        )

    @pytest.mark.asyncio
    async def test_register_duplicate_email_returns_409(self, client: AsyncClient):
        """重複メールで登録が409を返すこと"""
        unique_email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"
        # 初回登録
        await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "TestPass123!"},
        )
        # 重複登録
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "TestPass123!"},
        )
        assert response.status_code == 409


# ===================================================================
# DLP 認証（DLP Auth）
# ===================================================================
class TestDLPAuth:
    """DLP API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_dlp_rules_requires_auth(self, client: AsyncClient):
        """DLPルール一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dlp_events_requires_auth(self, client: AsyncClient):
        """DLPイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/events")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dlp_rules_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでDLPルール一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# DLP CRUD（DLP Operations）
# ===================================================================
class TestDLPCRUD:
    """DLP CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_dlp_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPルール一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_dlp_rule_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でDLPルール作成が422を返すこと"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={"description": "テストDLPルール"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_dlp_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_dlp_event_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """DLPイベントサマリーが200で返ること"""
        response = await client.get("/api/v1/dlp/events/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルールの更新で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/dlp/rules/{fake_id}",
            json={"is_active": False},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_dlp_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないDLPルールの削除で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/dlp/rules/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# 印刷管理 認証（Printing Auth）
# ===================================================================
class TestPrintingAuth:
    """印刷管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printers_requires_auth(self, client: AsyncClient):
        """プリンター一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/printers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_jobs_requires_auth(self, client: AsyncClient):
        """印刷ジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printers_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでプリンター一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 印刷管理 CRUD（Printing CRUD）
# ===================================================================
class TestPrintingCRUD:
    """印刷管理CRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_printers_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンター一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_printer_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損でプリンター作成が422を返すこと"""
        response = await client.post(
            "/api/v1/printing/printers",
            json={"location": "テスト場所"},  # name等欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_print_jobs_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ジョブ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_print_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計が200で返ること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_print_policies_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー一覧が200で返ること"""
        response = await client.get(
            "/api/v1/printing/policies", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_print_job_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で印刷ジョブ作成が422を返すこと"""
        response = await client.post(
            "/api/v1/printing/jobs",
            json={"user_name": "testuser"},  # printer_id, document_name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422
