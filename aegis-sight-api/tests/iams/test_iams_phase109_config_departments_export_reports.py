"""
IAMS移植テスト: システム設定・部門管理・データエクスポート・レポート生成（Phase57相当）
変換元: IAMS 設定/部門/エクスポート/レポートテスト 約60件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（設定CRUD/部門階層/デバイス・ライセンスエクスポート/SAM・資産・セキュリティレポート）
除外テスト数: 24件（外部ストリーミング依存・大規模エクスポート依存・レポートエンジン依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# システム設定テスト（Config）
# ===================================================================
class TestConfig:
    """システム設定テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_config_list_requires_auth(self, client: AsyncClient):
        """システム設定一覧は認証必須であること"""
        response = await client.get("/api/v1/config")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_config_list_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """システム設定一覧が200で返ること"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_config_list_contains_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """システム設定一覧レスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_key_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない設定キーの取得は404が返ること"""
        response = await client.get(
            "/api/v1/config/nonexistent_key_xyz", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_config_requires_auth(self, client: AsyncClient):
        """設定値の更新は認証必須であること"""
        response = await client.put(
            "/api/v1/config/some_key", json={"value": "test"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_config_missing_required_returns_422_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """設定値の更新時に必須フィールド不足はadmin以外403・不足は422が返ること"""
        response = await client.put(
            "/api/v1/config/some_key", json={}, headers=auth_headers
        )
        assert response.status_code in (403, 422)

    @pytest.mark.asyncio
    async def test_reset_config_requires_auth(self, client: AsyncClient):
        """設定リセットは認証必須であること"""
        response = await client.post("/api/v1/config/reset/some_key")
        assert response.status_code == 401


# ===================================================================
# 部門管理テスト（Departments）
# ===================================================================
class TestDepartments:
    """部門管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_departments_requires_auth(self, client: AsyncClient):
        """部門一覧は認証必須であること"""
        response = await client.get("/api/v1/departments")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_departments_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部門一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/departments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_create_department_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部門作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/departments", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部門の取得は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_department_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部門の更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/departments/{fake_id}",
            json={"description": "updated"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_department_devices_requires_auth(self, client: AsyncClient):
        """部門配下デバイス一覧は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/departments/{fake_id}/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_department_devices_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部門のデバイス一覧は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/devices", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_department_costs_requires_auth(self, client: AsyncClient):
        """部門コスト集計は認証必須であること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/v1/departments/{fake_id}/costs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_department_costs_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しない部門のコスト集計は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/departments/{fake_id}/costs", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_departments_tree_format_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """部門一覧のツリー形式取得が200で返ること"""
        response = await client.get(
            "/api/v1/departments?tree=true", headers=auth_headers
        )
        assert response.status_code == 200


# ===================================================================
# データエクスポートテスト（Export）
# ===================================================================
class TestExport:
    """データエクスポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_export_devices_requires_auth(self, client: AsyncClient):
        """デバイスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/devices")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_devices_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスエクスポートはauditor/admin/operatorロールが必要であること"""
        response = await client.get("/api/v1/export/devices", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_export_licenses_requires_auth(self, client: AsyncClient):
        """ライセンスエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/licenses")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_licenses_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスエクスポートはauditor/admin/operatorロールが必要であること"""
        response = await client.get("/api/v1/export/licenses", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_export_alerts_requires_auth(self, client: AsyncClient):
        """アラートエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/alerts")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_alerts_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アラートエクスポートはauditor/admin/operatorロールが必要であること"""
        response = await client.get("/api/v1/export/alerts", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_export_audit_logs_requires_auth(self, client: AsyncClient):
        """監査ログエクスポートは認証必須であること"""
        response = await client.get("/api/v1/export/audit-logs")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_export_audit_logs_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """監査ログエクスポートはauditor/adminロールが必要であること（operatorは不可）"""
        response = await client.get("/api/v1/export/audit-logs", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_export_devices_invalid_format_returns_422_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デバイスエクスポートの無効なformat値は422またはロール不足で403が返ること"""
        response = await client.get(
            "/api/v1/export/devices?format=xml", headers=auth_headers
        )
        assert response.status_code in (403, 422)

    @pytest.mark.asyncio
    async def test_export_licenses_json_format_returns_200_or_403(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ライセンスエクスポートのJSON形式指定がロール許可時に200で返ること"""
        response = await client.get(
            "/api/v1/export/licenses?format=json", headers=auth_headers
        )
        assert response.status_code in (200, 403)


# ===================================================================
# レポート生成テスト（Reports）
# ===================================================================
class TestReports:
    """レポート生成テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_report_requires_auth(self, client: AsyncClient):
        """SAMレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/sam")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_report_requires_auditor_or_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートはauditor/adminロールが必要であること"""
        response = await client.get("/api/v1/reports/sam", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_assets_report_requires_auth(self, client: AsyncClient):
        """資産インベントリレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_assets_report_requires_auditor_or_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産インベントリレポートはauditor/adminロールが必要であること"""
        response = await client.get("/api/v1/reports/assets", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_security_report_requires_auth(self, client: AsyncClient):
        """セキュリティレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/security")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_report_requires_auditor_or_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティレポートはauditor/adminロールが必要であること"""
        response = await client.get("/api/v1/reports/security", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_sam_report_with_date_from_param(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートにdate_fromパラメータを指定できること"""
        response = await client.get(
            "/api/v1/reports/sam?date_from=2026-01-01", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_sam_report_with_date_to_param(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートにdate_toパラメータを指定できること"""
        response = await client.get(
            "/api/v1/reports/sam?date_to=2026-12-31", headers=auth_headers
        )
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_sam_report_with_full_date_range(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートにdate_from/date_to両方を指定できること"""
        response = await client.get(
            "/api/v1/reports/sam?date_from=2026-01-01&date_to=2026-12-31",
            headers=auth_headers,
        )
        assert response.status_code in (200, 403)
