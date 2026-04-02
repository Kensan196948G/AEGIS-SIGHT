"""
IAMS移植テスト: 監査ログ・コンプライアンス（Phase7）
変換元: IAMS 監査・コンプライアンステスト 135件中100件選定
変換日: 2026-04-02
変換元テスト数: 100件
変換テスト数: 40件（優先度高・RBAC・フィルタリング・レスポンス構造）
除外テスト数: 60件（既存test_audit.py/test_compliance.pyでカバー済み）
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_AUDIT_ACTIONS = [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "export",
    "approve",
    "reject",
]


# ===================================================================
# 監査ログ RBAC（Audit Log Access Control）
# ===================================================================
class TestAuditLogRBAC:
    """監査ログアクセス制御テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient):
        """認証なしで 401 が返ること"""
        response = await client.get("/api/v1/audit/logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_requires_auth(self, client: AsyncClient):
        """エクスポートは認証必須であること"""
        response = await client.get("/api/v1/audit/logs/export")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_readonly_cannot_access_audit_logs(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールは監査ログにアクセスできないこと（403）"""
        response = await client.get("/api/v1/audit/logs", headers=readonly_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_readonly_cannot_export_audit_logs(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonly ロールはエクスポートできないこと（403）"""
        response = await client.get(
            "/api/v1/audit/logs/export", headers=readonly_headers
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_access_audit_logs(
        self, client: AsyncClient, auth_headers: dict
    ):
        """admin ロールは監査ログにアクセスできること（200）"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# 監査ログ レスポンス構造（Response Structure）
# ===================================================================
class TestAuditLogResponseStructure:
    """監査ログレスポンス構造テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_response_has_pagination_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """一覧レスポンスにページネーションフィールドが含まれること"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_default_limit_is_50(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit 未指定時のデフォルトが 50 であること"""
        response = await client.get("/api/v1/audit/logs", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["limit"] == 50

    @pytest.mark.asyncio
    async def test_custom_limit_applied(
        self, client: AsyncClient, auth_headers: dict
    ):
        """カスタム limit が適用されること"""
        response = await client.get(
            "/api/v1/audit/logs?limit=5", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 5
        assert len(data["items"]) <= 5

    @pytest.mark.asyncio
    async def test_limit_max_boundary(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit の最大値（200）が適用されること"""
        response = await client.get(
            "/api/v1/audit/logs?limit=200", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["limit"] == 200

    @pytest.mark.asyncio
    async def test_limit_exceeds_max_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit が 200 超で 422 が返ること"""
        response = await client.get(
            "/api/v1/audit/logs?limit=201", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_offset_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """負の offset で 422 が返ること"""
        response = await client.get(
            "/api/v1/audit/logs?offset=-1", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# 監査ログ フィルタリング（Filtering）
# ===================================================================
class TestAuditLogFiltering:
    """監査ログフィルタリングテスト（IAMS移植）"""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("action", ALL_AUDIT_ACTIONS)
    async def test_filter_by_action_type(
        self, client: AsyncClient, auth_headers: dict, action: str
    ):
        """全アクション種別でフィルタが機能すること（結果0件も許容）"""
        response = await client.get(
            f"/api/v1/audit/logs?action={action}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["action"] == action

    @pytest.mark.asyncio
    async def test_invalid_action_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なアクション値で 422 が返ること"""
        response = await client.get(
            "/api/v1/audit/logs?action=invalid_action", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_filter_by_resource_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """resource_type フィルタが機能すること（結果0件も許容）"""
        response = await client.get(
            "/api/v1/audit/logs?resource_type=device", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["resource_type"] == "device"

    @pytest.mark.asyncio
    async def test_filter_by_user_id_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なUUID形式のuser_idで 422 が返ること"""
        response = await client.get(
            "/api/v1/audit/logs?user_id=not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_filter_by_date_from(
        self, client: AsyncClient, auth_headers: dict
    ):
        """date_from フィルタが機能すること（結果0件も許容）"""
        response = await client.get(
            "/api/v1/audit/logs?date_from=2026-01-01T00:00:00Z",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_combined_filters(
        self, client: AsyncClient, auth_headers: dict
    ):
        """複数フィルタを組み合わせても正常動作すること"""
        response = await client.get(
            "/api/v1/audit/logs?action=login&resource_type=user&limit=10",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10


# ===================================================================
# 監査ログ エクスポート（Export）
# ===================================================================
class TestAuditLogExport:
    """監査ログエクスポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_csv_export_content_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """CSVエクスポートのContent-Typeが text/csv であること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=csv", headers=auth_headers
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_json_export_content_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """JSONエクスポートのContent-Typeが application/json であること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=json", headers=auth_headers
        )
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_invalid_format_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なフォーマット指定で 422 が返ること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=xml", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_csv_export_has_content_disposition(
        self, client: AsyncClient, auth_headers: dict
    ):
        """CSVエクスポートに Content-Disposition ヘッダーがあること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=csv", headers=auth_headers
        )
        assert response.status_code == 200
        assert "audit_logs" in response.headers.get("content-disposition", "")

    @pytest.mark.asyncio
    async def test_json_export_is_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """JSONエクスポートがリスト形式であること"""
        response = await client.get(
            "/api/v1/audit/logs/export?format=json", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ===================================================================
# コンプライアンス API（Compliance）
# ===================================================================
class TestComplianceAPI:
    """コンプライアンスAPIテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_overview_requires_auth(self, client: AsyncClient):
        """コンプライアンス概要は認証必須であること"""
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_iso27001_requires_auth(self, client: AsyncClient):
        """ISO27001 エンドポイントは認証必須であること"""
        response = await client.get("/api/v1/compliance/iso27001")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_jsox_requires_auth(self, client: AsyncClient):
        """J-SOX エンドポイントは認証必須であること"""
        response = await client.get("/api/v1/compliance/jsox")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_nist_requires_auth(self, client: AsyncClient):
        """NIST CSF エンドポイントは認証必須であること"""
        response = await client.get("/api/v1/compliance/nist")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_overview_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """概要レスポンスに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        required_fields = ["overall_score", "frameworks", "recent_issues", "audit_events"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_overall_score_range(
        self, client: AsyncClient, auth_headers: dict
    ):
        """overall_score が 0〜100 の範囲内であること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200
        score = response.json()["overall_score"]
        assert 0 <= score <= 100

    @pytest.mark.asyncio
    async def test_iso27001_categories_have_scores(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ISO27001 カテゴリに score フィールドが含まれること"""
        response = await client.get(
            "/api/v1/compliance/iso27001", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        for cat in data["categories"]:
            assert "score" in cat
            assert 0 <= cat["score"] <= cat.get("max_score", 100)

    @pytest.mark.asyncio
    async def test_nist_tiers_in_valid_range(
        self, client: AsyncClient, auth_headers: dict
    ):
        """NIST CSF の tier が 1〜4 の範囲内であること"""
        response = await client.get(
            "/api/v1/compliance/nist", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "functions" in data
        for func in data["functions"]:
            assert 1 <= func["tier"] <= 4
            assert 1 <= func["target_tier"] <= 4

    @pytest.mark.asyncio
    async def test_jsox_controls_have_remediation_progress(
        self, client: AsyncClient, auth_headers: dict
    ):
        """J-SOX コントロールに remediation_progress フィールドが含まれること"""
        response = await client.get(
            "/api/v1/compliance/jsox", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "controls" in data
        for ctrl in data["controls"]:
            assert "remediation_progress" in ctrl
            assert 0 <= ctrl["remediation_progress"] <= 100
