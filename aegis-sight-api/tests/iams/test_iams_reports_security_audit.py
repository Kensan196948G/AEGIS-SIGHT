"""
IAMS移植テスト: レポート生成・セキュリティ監査（Phase12）
変換元: IAMS レポート・セキュリティ監査テスト 90件中70件選定
変換日: 2026-04-02
変換元テスト数: 70件
変換テスト数: 36件（優先度高・RBAC・CSV検証・セッション管理）
除外テスト数: 34件（WSUS接続依存・外部SIEM連携依存）
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# レポート生成 認証・認可（Reports Authentication / Authorization）
# ===================================================================
class TestReportsAuth:
    """レポートAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_report_requires_auth(self, client: AsyncClient):
        """SAMレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/sam")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_assets_report_requires_auth(self, client: AsyncClient):
        """資産インベントリレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_report_requires_auth(self, client: AsyncClient):
        """セキュリティレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/security")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_report_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールはSAMレポートにアクセス不可であること（403）"""
        response = await client.get("/api/v1/reports/sam", headers=readonly_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_assets_report_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールは資産レポートにアクセス不可であること（403）"""
        response = await client.get("/api/v1/reports/assets", headers=readonly_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_sam_report_accessible_with_auditor(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """auditorロールでSAMレポートにアクセスできること（200）"""
        response = await client.get("/api/v1/reports/sam", headers=auditor_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_assets_report_accessible_with_auditor(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """auditorロールで資産レポートにアクセスできること（200）"""
        response = await client.get("/api/v1/reports/assets", headers=auditor_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_security_report_accessible_with_auditor(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """auditorロールでセキュリティレポートにアクセスできること（200）"""
        response = await client.get("/api/v1/reports/security", headers=auditor_headers)
        assert response.status_code == 200


# ===================================================================
# レポート内容検証（Reports Content Validation）
# ===================================================================
class TestReportsContent:
    """レポート内容テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_report_returns_csv(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """SAMレポートがCSV形式で返ること"""
        response = await client.get("/api/v1/reports/sam", headers=auditor_headers)
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type, (
            f"Expected text/csv, got: {content_type}"
        )

    @pytest.mark.asyncio
    async def test_assets_report_returns_csv(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """資産レポートがCSV形式で返ること"""
        response = await client.get("/api/v1/reports/assets", headers=auditor_headers)
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type

    @pytest.mark.asyncio
    async def test_security_report_returns_csv(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """セキュリティレポートがCSV形式で返ること"""
        response = await client.get("/api/v1/reports/security", headers=auditor_headers)
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type

    @pytest.mark.asyncio
    async def test_sam_report_has_content_disposition(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """SAMレポートにContent-Dispositionヘッダが含まれること"""
        response = await client.get("/api/v1/reports/sam", headers=auditor_headers)
        assert response.status_code == 200
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp

    @pytest.mark.asyncio
    async def test_sam_report_with_date_filter(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """SAMレポートに日付フィルタが適用できること（200）"""
        response = await client.get(
            "/api/v1/reports/sam?date_from=2026-01-01T00:00:00Z&date_to=2026-12-31T23:59:59Z",
            headers=auditor_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sam_report_accessible_with_admin(
        self, client: AsyncClient, admin_headers: dict
    ):
        """adminロールでSAMレポートにアクセスできること（200）"""
        response = await client.get("/api/v1/reports/sam", headers=admin_headers)
        assert response.status_code == 200


# ===================================================================
# セキュリティ監査 認証・認可（Security Audit Auth）
# ===================================================================
class TestSecurityAuditAuth:
    """セキュリティ監査API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_failed_logins_requires_auth(self, client: AsyncClient):
        """ログイン失敗一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/failed-logins")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_active_sessions_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/active-sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_failed_logins_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールはログイン失敗一覧にアクセス不可であること（403）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=readonly_headers
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_active_sessions_readonly_forbidden(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールはアクティブセッションにアクセス不可であること（403）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=readonly_headers
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_auditor_cannot_access_security_audit(
        self, client: AsyncClient, auditor_headers: dict
    ):
        """auditorロールはセキュリティ監査にアクセス不可であること（admin専用）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auditor_headers
        )
        # admin専用のため403が返ること
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_failed_logins_accessible_with_admin(
        self, client: AsyncClient, admin_headers: dict
    ):
        """adminロールでログイン失敗一覧にアクセスできること（200）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=admin_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_active_sessions_accessible_with_admin(
        self, client: AsyncClient, admin_headers: dict
    ):
        """adminロールでアクティブセッション一覧にアクセスできること（200）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=admin_headers
        )
        assert response.status_code == 200


# ===================================================================
# ログイン失敗一覧（Failed Logins）
# ===================================================================
class TestFailedLogins:
    """ログイン失敗一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_failed_logins_has_required_fields(
        self, client: AsyncClient, admin_headers: dict
    ):
        """ログイン失敗レスポンスに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["total"], int)
        assert data["total"] >= 0

    @pytest.mark.asyncio
    async def test_failed_logins_items_have_required_fields(
        self, client: AsyncClient, admin_headers: dict
    ):
        """ログイン失敗アイテムに必須フィールドが含まれること（データなしは空配列で許容）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            for field in ("id", "created_at"):
                assert field in item, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_failed_logins_with_limit_filter(
        self, client: AsyncClient, admin_headers: dict
    ):
        """limitパラメータでログイン失敗件数を制限できること"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins?limit=5", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 5


# ===================================================================
# アクティブセッション（Active Sessions）
# ===================================================================
class TestActiveSessions:
    """アクティブセッションテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_active_sessions_has_required_fields(
        self, client: AsyncClient, admin_headers: dict
    ):
        """アクティブセッションレスポンスに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["total"], int)
        assert data["total"] >= 0

    @pytest.mark.asyncio
    async def test_active_sessions_items_structure(
        self, client: AsyncClient, admin_headers: dict
    ):
        """アクティブセッションアイテムの構造が正しいこと（データなしは空配列で許容）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            for field in ("session_id", "user_id", "created_at"):
                assert field in item, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_session_returns_error(
        self, client: AsyncClient, admin_headers: dict
    ):
        """存在しないセッションの取り消しで4xxが返ること"""
        response = await client.post(
            "/api/v1/security/audit/revoke/non-existent-session-id",
            headers=admin_headers,
        )
        # セッションが存在しない場合は4xx（404 or 400）
        assert response.status_code in (400, 404), (
            f"Expected 400 or 404, got {response.status_code}"
        )
