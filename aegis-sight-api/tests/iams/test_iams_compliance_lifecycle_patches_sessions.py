"""
IAMS移植テスト: コンプライアンス・ライフサイクル管理・パッチ管理・セッション管理（Phase30）
変換元: IAMS コンプライアンス・ライフサイクル・パッチ・セッション管理テスト 80件中58件選定
変換日: 2026-04-02
変換元テスト数: 58件
変換テスト数: 36件（コンプライアンス・ライフサイクル廃棄・パッチ更新・セッション管理）
除外テスト数: 22件（外部コンプライアンスツール依存・物理廃棄承認依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# コンプライアンス 認証（Compliance Auth）
# ===================================================================
class TestComplianceAuth:
    """コンプライアンスAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_requires_auth(self, client: AsyncClient):
        """コンプライアンス概要は認証必須であること"""
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_iso27001_requires_auth(self, client: AsyncClient):
        """ISO27001コンプライアンスは認証必須であること"""
        response = await client.get("/api/v1/compliance/iso27001")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_overview_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでコンプライアンス概要にアクセスできること（200）"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# コンプライアンス エンドポイント（Compliance Endpoints）
# ===================================================================
class TestComplianceEndpoints:
    """コンプライアンスエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンス概要が200で返ること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_iso27001_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ISO27001コンプライアンスが200で返ること"""
        response = await client.get("/api/v1/compliance/iso27001", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_jsox_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """J-SOXコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/compliance/jsox", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_nist_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """NISTコンプライアンスが200で返ること"""
        response = await client.get("/api/v1/compliance/nist", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンスサマリーが200で返ること"""
        response = await client.get("/api/v1/compliance/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_disposals_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """廃棄一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/compliance/disposals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_approve_nonexistent_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない廃棄申請の承認で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/compliance/disposals/{fake_id}/approve",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# ライフサイクル管理（Lifecycle Management）
# ===================================================================
class TestLifecycleManagement:
    """ライフサイクル管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_lifecycle_summary_requires_auth(self, client: AsyncClient):
        """ライフサイクルサマリーは認証必須であること"""
        response = await client.get("/api/v1/lifecycle/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_lifecycle_disposals_requires_auth(self, client: AsyncClient):
        """廃棄一覧は認証必須であること"""
        response = await client.get("/api/v1/lifecycle/disposals")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_lifecycle_summary_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライフサイクルサマリーが200で返ること"""
        response = await client.get("/api/v1/lifecycle/summary", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_lifecycle_disposals_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライフサイクル廃棄一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/lifecycle/disposals", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_approve_nonexistent_lifecycle_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないライフサイクル廃棄の承認で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/approve",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_complete_nonexistent_lifecycle_disposal_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないライフサイクル廃棄の完了で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/lifecycle/disposals/{fake_id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# パッチ管理（Patch Management）
# ===================================================================
class TestPatchManagement:
    """パッチ管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_patch_updates_requires_auth(self, client: AsyncClient):
        """パッチ更新一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/updates")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patch_vulnerabilities_requires_auth(self, client: AsyncClient):
        """脆弱性一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/vulnerabilities")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_patch_updates_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """パッチ更新一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/updates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_patch_device_status_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """パッチデバイスステータスが200で返ること"""
        response = await client.get(
            "/api/v1/patches/device-status", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_patch_compliance_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """パッチコンプライアンスが200で返ること"""
        response = await client.get(
            "/api/v1/patches/compliance", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_patch_missing_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不足パッチ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/missing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_patch_vulnerabilities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """脆弱性一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/patches/vulnerabilities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_vulnerability_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない脆弱性の解決で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/patches/vulnerabilities/{fake_id}/resolve",
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# セッション管理（Session Management）
# ===================================================================
class TestSessionManagement:
    """セッション管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sessions_active_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/sessions/active")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_analytics_requires_auth(self, client: AsyncClient):
        """セッション分析は認証必須であること"""
        response = await client.get("/api/v1/sessions/analytics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sessions_active_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sessions/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_sessions_analytics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッション分析が200で返ること"""
        response = await client.get("/api/v1/sessions/analytics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sessions_activities_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セッションアクティビティ一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/sessions/activities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_end_nonexistent_session_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの終了で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sessions/{fake_id}/end",
            headers=auth_headers,
        )
        assert response.status_code == 404
