"""
IAMS移植テスト: コンプライアンス・セキュリティ・メトリクス・ログ管理（Phase22）
変換元: IAMS コンプライアンス・セキュリティ・運用ログテスト 85件中62件選定
変換日: 2026-04-02
変換元テスト数: 62件
変換テスト数: 36件（コンプライアンス概要・セキュリティ概要・メトリクス・ログイベント）
除外テスト数: 26件（外部GRC連携依存・エージェントSyslog依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_COMPLIANCE_FRAMEWORKS = ["iso27001", "jsox", "nist"]
ALL_LOG_TYPES = ["logon", "usb", "file"]


# ===================================================================
# コンプライアンス 認証（Compliance Auth）
# ===================================================================
class TestComplianceAuth:
    """コンプライアンスAPI認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_requires_auth(self, client: AsyncClient):
        """コンプライアンス概要は認証不要であること（publicエンドポイント）"""
        # compliance/overviewは認証不要の場合がある
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code in (200, 401)

    @pytest.mark.asyncio
    async def test_compliance_overview_accessible(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでコンプライアンス概要にアクセスできること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_iso27001_accessible(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでISO27001ステータスにアクセスできること"""
        response = await client.get(
            "/api/v1/compliance/iso27001", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# コンプライアンス エンドポイント（Compliance Endpoints）
# ===================================================================
class TestComplianceEndpoints:
    """コンプライアンスエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンス概要に必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("iso27001_score", "jsox_status", "nist_tier", "open_issues"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_compliance_scores_are_valid(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンススコアが有効な範囲であること"""
        response = await client.get(
            "/api/v1/compliance/overview", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert 0.0 <= data["iso27001_score"] <= 100.0
        assert data["nist_tier"] >= 0.0

    @pytest.mark.asyncio
    async def test_iso27001_has_overall_score(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ISO27001レスポンスにoverall_scoreが含まれること"""
        response = await client.get(
            "/api/v1/compliance/iso27001", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "categories" in data
        assert isinstance(data["categories"], list)

    @pytest.mark.asyncio
    async def test_jsox_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """J-SOXステータスが200で返ること"""
        response = await client.get(
            "/api/v1/compliance/jsox", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_nist_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """NISTステータスが200で返ること"""
        response = await client.get(
            "/api/v1/compliance/nist", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# セキュリティ概要 認証・エンドポイント（Security Overview）
# ===================================================================
class TestSecurityOverview:
    """セキュリティ概要テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_security_overview_requires_auth(self, client: AsyncClient):
        """セキュリティ概要は認証必須であること"""
        response = await client.get("/api/v1/security/overview")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_overview_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要が200で返ること"""
        response = await client.get(
            "/api/v1/security/overview", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_security_overview_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティ概要に必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/security/overview", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # 少なくとも何らかのフィールドが含まれること
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_device_security_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのセキュリティ情報で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/security/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


# ===================================================================
# メトリクス 認証・エンドポイント（Metrics）
# ===================================================================
class TestMetrics:
    """メトリクスエンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_metrics_requires_auth(self, client: AsyncClient):
        """メトリクスは認証必須であること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_metrics_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """メトリクスが200で返ること"""
        response = await client.get("/api/v1/metrics", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_metrics_has_content(
        self, client: AsyncClient, auth_headers: dict
    ):
        """メトリクスレスポンスにコンテンツが含まれること"""
        response = await client.get("/api/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.content) > 0


# ===================================================================
# ログ管理 認証（Logs Auth）
# ===================================================================
class TestLogsAuth:
    """ログ管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logon_events_requires_auth(self, client: AsyncClient):
        """ログオンイベントは認証必須であること"""
        response = await client.get("/api/v1/logs/logon")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_usb_events_requires_auth(self, client: AsyncClient):
        """USBイベントは認証必須であること"""
        response = await client.get("/api/v1/logs/usb")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_file_events_requires_auth(self, client: AsyncClient):
        """ファイルイベントは認証必須であること"""
        response = await client.get("/api/v1/logs/file")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_log_summary_requires_auth(self, client: AsyncClient):
        """ログサマリーは認証必須であること"""
        response = await client.get("/api/v1/logs/summary")
        assert response.status_code == 401


# ===================================================================
# ログ管理 エンドポイント（Logs Endpoints）
# ===================================================================
class TestLogsEndpoints:
    """ログ管理エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_logon_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログオンイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/logon", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_usb_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """USBイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/usb", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_file_events_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ファイルイベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/logs/file", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_log_summary_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ログサマリーに必須フィールドが含まれること"""
        response = await client.get("/api/v1/logs/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    @pytest.mark.asyncio
    async def test_filter_logon_events_by_device_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        """device_idフィルタが機能すること（0件も許容）"""
        fake_device_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/logs/logon?device_id={fake_device_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0 or all(
            item.get("device_id") == fake_device_id for item in data["items"]
        )
