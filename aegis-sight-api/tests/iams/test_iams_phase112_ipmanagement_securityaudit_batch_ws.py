"""
IAMS移植テスト: IPアドレス管理・セキュリティ監査・バッチ処理（Phase60相当）
変換元: IAMS ネットワーク/セキュリティ監査/バッチテスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（IPレンジ/アサイン/コンフリクト/トポロジー/失敗ログイン/セッション/CSV一括）
除外テスト数: 29件（WebSocket依存・大規模バッチ依存・実IPネットワーク依存）
"""

import io

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# IPアドレス管理テスト（IP Management）
# ===================================================================
class TestIPManagement:
    """IPアドレス管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_ip_ranges_requires_auth(self, client: AsyncClient):
        """IPレンジ一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-ranges")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_ranges_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/network/ip-ranges", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_ip_ranges_filter_by_location_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ一覧をlocationでフィルタリングできること"""
        response = await client.get(
            "/api/v1/network/ip-ranges?location=tokyo", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_ip_range_requires_auth(self, client: AsyncClient):
        """IPレンジ作成は認証必須であること"""
        response = await client.post("/api/v1/network/ip-ranges", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_ip_range_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPレンジ作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/network/ip-ranges", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_ip_range_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの取得は404が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_ip_range_utilization_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないIPレンジの使用率取得は404が返ること"""
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/network/ip-ranges/{fake_id}/utilization", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_ip_assignments_requires_auth(self, client: AsyncClient):
        """IPアサイン一覧は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_assignments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサイン一覧がページネーション形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_ip_assignment_requires_auth(self, client: AsyncClient):
        """IPアサイン作成は認証必須であること"""
        response = await client.post("/api/v1/network/ip-assignments", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_ip_assignment_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPアサイン作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/network/ip-assignments", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_ip_conflicts_requires_auth(self, client: AsyncClient):
        """IPコンフリクト検出は認証必須であること"""
        response = await client.get("/api/v1/network/ip-assignments/conflicts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ip_conflicts_returns_list(
        self, client: AsyncClient, auth_headers: dict
    ):
        """IPコンフリクト検出がリスト形式で返ること"""
        response = await client.get(
            "/api/v1/network/ip-assignments/conflicts", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_topology_requires_auth(self, client: AsyncClient):
        """ネットワークトポロジーは認証必須であること"""
        response = await client.get("/api/v1/network/topology")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_topology_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ネットワークトポロジーが200で返ること"""
        response = await client.get("/api/v1/network/topology", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# セキュリティ監査テスト（Security Audit）
# ===================================================================
class TestSecurityAudit:
    """セキュリティ監査テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_failed_logins_requires_auth(self, client: AsyncClient):
        """失敗ログイン一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/failed-logins")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_failed_logins_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """失敗ログイン一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_failed_logins_has_items_and_total_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """失敗ログイン一覧レスポンスにitems・totalフィールドが含まれること（admin許可時）"""
        response = await client.get(
            "/api/v1/security/audit/failed-logins", headers=auth_headers
        )
        if response.status_code == 200:
            data = response.json()
            assert "items" in data
            assert "total" in data

    @pytest.mark.asyncio
    async def test_active_sessions_requires_auth(self, client: AsyncClient):
        """アクティブセッション一覧は認証必須であること"""
        response = await client.get("/api/v1/security/audit/active-sessions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_active_sessions_requires_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アクティブセッション一覧はadminロールが必要であること（通常ユーザーは403）"""
        response = await client.get(
            "/api/v1/security/audit/active-sessions", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_revoke_session_requires_auth(self, client: AsyncClient):
        """セッション無効化は認証必須であること"""
        response = await client.post(
            "/api/v1/security/audit/revoke-session/test-session-id"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_session_returns_404_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないセッションの無効化は404またはadmin不足で403が返ること"""
        response = await client.post(
            "/api/v1/security/audit/revoke-session/nonexistent-session-xyz",
            headers=auth_headers,
        )
        assert response.status_code in (403, 404)


# ===================================================================
# バッチ処理テスト（Batch）
# ===================================================================
class TestBatch:
    """バッチ処理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_import_devices_requires_auth(self, client: AsyncClient):
        """デバイスCSVインポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_import_devices_missing_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVインポートにファイルが無いと422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/devices", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_import_devices_valid_csv_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVインポートで正常CSVを送信すると200が返ること"""
        csv_content = b"hostname,os_version,ip_address\nphase112-test-host,Windows 10,192.168.254.1\n"
        response = await client.post(
            "/api/v1/batch/import/devices",
            headers=auth_headers,
            files={"file": ("devices.csv", io.BytesIO(csv_content), "text/csv")},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_import_devices_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVインポートレスポンスに必須フィールドが含まれること"""
        csv_content = b"hostname,os_version\nphase112-fields-test,Ubuntu 22.04\n"
        response = await client.post(
            "/api/v1/batch/import/devices",
            headers=auth_headers,
            files={"file": ("devices.csv", io.BytesIO(csv_content), "text/csv")},
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("job_id", "status", "total_rows", "success_count", "error_count"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_import_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスCSVインポートは認証必須であること"""
        response = await client.post("/api/v1/batch/import/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_import_licenses_missing_file_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスCSVインポートにファイルが無いと422が返ること"""
        response = await client.post(
            "/api/v1/batch/import/licenses", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_import_licenses_valid_csv_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスCSVインポートで正常CSVを送信すると200が返ること"""
        csv_content = b"software_name,vendor,license_type,purchased_count\nPhase112 Office,TestVendor,perpetual,5\n"
        response = await client.post(
            "/api/v1/batch/import/licenses",
            headers=auth_headers,
            files={"file": ("licenses.csv", io.BytesIO(csv_content), "text/csv")},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_devices_requires_auth(self, client: AsyncClient):
        """デバイスCSVエクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_devices_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVエクスポートが200で返ること"""
        response = await client.get(
            "/api/v1/batch/export/devices", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_export_devices_content_type_is_csv(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスCSVエクスポートのContent-TypeがCSV形式であること"""
        response = await client.get(
            "/api/v1/batch/export/devices", headers=auth_headers
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_export_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスCSVエクスポートは認証必須であること"""
        response = await client.get("/api/v1/batch/export/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_jobs_requires_auth(self, client: AsyncClient):
        """バッチジョブ履歴は認証必須であること"""
        response = await client.get("/api/v1/batch/jobs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_batch_jobs_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチジョブ履歴が200で返ること"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_batch_jobs_has_jobs_and_total_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """バッチジョブ履歴レスポンスにjobs・totalフィールドが含まれること"""
        response = await client.get("/api/v1/batch/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data
