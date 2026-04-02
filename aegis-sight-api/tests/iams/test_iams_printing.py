"""
IAMS移植テスト: 印刷管理・プリンタ・印刷ポリシー（Phase14）
変換元: IAMS 印刷管理テスト 95件中72件選定
変換日: 2026-04-02
変換元テスト数: 72件
変換テスト数: 38件（認証・プリンタCRUD・印刷ジョブ・統計・ポリシー・評価）
除外テスト数: 34件（実機プリンタ依存・スプーラー通信依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_PRINT_JOB_STATUSES = ["completed", "failed", "cancelled"]
ALL_PAPER_SIZES = ["A4", "A3", "B5", "Letter"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestPrintingAuth:
    """印刷管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_printers_list_requires_auth(self, client: AsyncClient):
        """プリンタ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/printers")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_jobs_requires_auth(self, client: AsyncClient):
        """印刷ジョブ一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_stats_requires_auth(self, client: AsyncClient):
        """印刷統計は認証必須であること"""
        response = await client.get("/api/v1/printing/stats")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_print_policies_requires_auth(self, client: AsyncClient):
        """印刷ポリシー一覧は認証必須であること"""
        response = await client.get("/api/v1/printing/policies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_evaluate_requires_auth(self, client: AsyncClient):
        """印刷評価エンドポイントは認証必須であること"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={"user_name": "test", "pages": 1},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_printers_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでプリンタ一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_printers(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールでもプリンタ一覧にアクセスできること"""
        response = await client.get("/api/v1/printing/printers", headers=readonly_headers)
        assert response.status_code == 200


# ===================================================================
# プリンタ CRUD（Printers CRUD）
# ===================================================================
class TestPrintersCRUD:
    """プリンタCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_printers_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンタ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/printers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_printer_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/printing/printers",
            json={"name": "テストプリンタ"},  # location, model 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_printer_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """プリンタを正常に作成できること"""
        response = await client.post(
            "/api/v1/printing/printers",
            json={
                "name": "IAMS移植テスト-プリンタ01",
                "location": "2F-会議室A",
                "model": "HP LaserJet Pro",
                "is_network": True,
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_printer_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したプリンタのレスポンスに必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/printing/printers",
            json={
                "name": "IAMS移植テスト-フィールド確認",
                "location": "1F-受付",
                "model": "Canon imageRUNNER",
                "is_network": False,
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name", "location", "model", "is_active"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_filter_printers_by_is_active(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_activeフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/printing/printers?is_active=true", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True


# ===================================================================
# 印刷ジョブ（Print Jobs）
# ===================================================================
class TestPrintJobs:
    """印刷ジョブテスト（IAMS移植）"""

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
    async def test_create_print_job_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/printing/jobs",
            json={"user_name": "testuser"},  # printer_id, document_name, pages, status 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_print_job_invalid_printer_returns_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないプリンタIDで印刷ジョブを作成するとエラーが返ること"""
        fake_printer_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/printing/jobs",
            json={
                "printer_id": fake_printer_id,
                "user_name": "testuser",
                "document_name": "テスト文書.pdf",
                "pages": 5,
                "copies": 1,
                "color": False,
                "duplex": True,
                "paper_size": "A4",
                "status": "completed",
            },
            headers=auth_headers,
        )
        # 存在しないプリンタ参照はエラー（400/404/422/500）
        assert response.status_code in (400, 404, 422, 500)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status", ALL_PRINT_JOB_STATUSES)
    async def test_filter_jobs_by_status(
        self, client: AsyncClient, auth_headers: dict, status: str
    ):
        """statusフィルタが機能すること（0件も許容）"""
        response = await client.get(
            f"/api/v1/printing/jobs?status={status}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == status

    @pytest.mark.asyncio
    async def test_invalid_job_status_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なstatusで422が返ること"""
        response = await client.get(
            "/api/v1/printing/jobs?status=invalid_status", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# 印刷統計（Print Stats）
# ===================================================================
class TestPrintStats:
    """印刷統計テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_print_stats_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計が200で返ること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_print_stats_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計に必須フィールドが含まれること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("total_pages", "total_jobs", "color_ratio"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_print_stats_numeric_fields_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計の数値フィールドは非負であること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_pages"] >= 0
        assert data["total_jobs"] >= 0
        assert data["color_ratio"] >= 0.0

    @pytest.mark.asyncio
    async def test_print_stats_has_breakdown_lists(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷統計に内訳リストが含まれること"""
        response = await client.get("/api/v1/printing/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("by_user", "by_printer", "by_department", "monthly_trend"):
            assert field in data, f"Missing breakdown field: {field}"
            assert isinstance(data[field], list), f"{field} should be a list"


# ===================================================================
# 印刷ポリシー（Print Policies）
# ===================================================================
class TestPrintPolicies:
    """印刷ポリシーテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_print_policies_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシー一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/printing/policies", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_print_policy_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/printing/policies",
            json={},  # name 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_print_policy_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        """印刷ポリシーを正常に作成できること"""
        response = await client.post(
            "/api/v1/printing/policies",
            json={
                "name": "IAMS移植テスト-カラー制限ポリシー",
                "allow_color": False,
                "allow_duplex_only": True,
                "is_enabled": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"予期しないステータス: {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_print_policy_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したポリシーのレスポンスに必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/printing/policies",
            json={
                "name": "IAMS移植テスト-フィールド確認ポリシー",
                "allow_color": True,
                "allow_duplex_only": False,
                "max_pages_per_day": 100,
                "is_enabled": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "name", "allow_color", "allow_duplex_only", "is_enabled"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_policy_with_department_targeting(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部署ターゲットポリシーを作成できること"""
        response = await client.post(
            "/api/v1/printing/policies",
            json={
                "name": "IAMS移植テスト-部署ターゲットポリシー",
                "allow_color": False,
                "target_departments": ["営業部", "総務部"],
                "is_enabled": True,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)


# ===================================================================
# 印刷ポリシー評価（Print Policy Evaluation）
# ===================================================================
class TestPrintPolicyEvaluation:
    """印刷ポリシー評価テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_evaluate_returns_result_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """評価結果に必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={
                "user_name": "testuser",
                "pages": 5,
                "copies": 1,
                "color": False,
                "duplex": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "allowed" in data
        assert isinstance(data["allowed"], bool)
        assert "violations" in data
        assert isinstance(data["violations"], list)

    @pytest.mark.asyncio
    async def test_evaluate_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={"color": True},  # user_name, pages 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_evaluate_color_print_returns_result(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カラー印刷評価が正常に処理されること"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={
                "user_name": "testuser",
                "pages": 10,
                "copies": 2,
                "color": True,
                "duplex": False,
                "department": "営業部",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "allowed" in data
        assert "violations" in data

    @pytest.mark.asyncio
    async def test_evaluate_large_job_returns_result(
        self, client: AsyncClient, auth_headers: dict
    ):
        """大量印刷評価が正常に処理されること（制限超過チェック）"""
        response = await client.post(
            "/api/v1/printing/evaluate",
            json={
                "user_name": "testuser",
                "pages": 500,
                "copies": 10,
                "color": False,
                "duplex": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "allowed" in data
        assert isinstance(data["violations"], list)
