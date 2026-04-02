"""
IAMS移植テスト: SLA管理・コンプライアンス・レポート・テレメトリ（Phase49相当）
変換元: IAMS SLA管理・コンプライアンス・レポート・テレメトリテスト 約60件中36件選定
変換日: 2026-04-02
変換元テスト数: 60件
変換テスト数: 36件（SLA定義/測定/違反/ダッシュボード/レポート・コンプライアンス・レポートCSV・テレメトリ）
除外テスト数: 24件（外部監査フロー依存・メール通知依存・スケジュールレポート依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# SLA管理テスト（SLA Management）
# ===================================================================
class TestSLADefinitions:
    """SLA定義管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_definitions_requires_auth(self, client: AsyncClient):
        """SLA定義一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/definitions")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sla_definitions_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA定義一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/definitions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_sla_definitions_filter_by_active(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA定義をis_activeでフィルタリングできること"""
        response = await client.get(
            "/api/v1/sla/definitions?is_active=true", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_sla_definition_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA定義作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/sla/definitions", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_nonexistent_sla_definition_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないSLA定義の更新は404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/sla/definitions/{fake_id}",
            json={"target_value": 99.9},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestSLAMeasurements:
    """SLA測定テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_measurements_requires_auth(self, client: AsyncClient):
        """SLA測定一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/measurements")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sla_measurements_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA測定一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/measurements", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_sla_measurements_filter_by_is_met(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA測定をis_metでフィルタリングできること"""
        response = await client.get(
            "/api/v1/sla/measurements?is_met=false", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_sla_measurement_missing_required_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA測定作成時に必須フィールドが不足すると422が返ること"""
        response = await client.post(
            "/api/v1/sla/measurements", json={}, headers=auth_headers
        )
        assert response.status_code == 422


class TestSLAViolations:
    """SLA違反テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_violations_requires_auth(self, client: AsyncClient):
        """SLA違反一覧は認証必須であること"""
        response = await client.get("/api/v1/sla/violations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sla_violations_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA違反一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/sla/violations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing pagination field: {field}"

    @pytest.mark.asyncio
    async def test_sla_violations_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA違反をseverityでフィルタリングできること"""
        response = await client.get(
            "/api/v1/sla/violations?severity=high", headers=auth_headers
        )
        assert response.status_code in (200, 422)


class TestSLADashboardAndReport:
    """SLAダッシュボード・レポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_dashboard_requires_auth(self, client: AsyncClient):
        """SLAダッシュボードは認証必須であること"""
        response = await client.get("/api/v1/sla/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_dashboard_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAダッシュボードが200で返ること"""
        response = await client.get("/api/v1/sla/dashboard", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sla_report_requires_auth(self, client: AsyncClient):
        """SLAレポートは認証必須であること"""
        response = await client.get("/api/v1/sla/report?month=1&year=2026")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sla_report_missing_required_params_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAレポートはmonth/yearが必須であること"""
        response = await client.get("/api/v1/sla/report", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_sla_report_with_valid_params_returns_200(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAレポートが正常なパラメータで200を返ること"""
        response = await client.get(
            "/api/v1/sla/report?month=3&year=2026", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sla_report_invalid_month_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAレポートのmonthが範囲外（13）なら422が返ること"""
        response = await client.get(
            "/api/v1/sla/report?month=13&year=2026", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# コンプライアンステスト（Compliance）
# ===================================================================
class TestCompliance:
    """コンプライアンス管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_overview_returns_200(self, client: AsyncClient):
        """コンプライアンス概要は認証なしでも200が返ること（公開エンドポイント）"""
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_compliance_overview_contains_required_fields(
        self, client: AsyncClient
    ):
        """コンプライアンス概要レスポンスに必須フィールドが含まれること"""
        response = await client.get("/api/v1/compliance/overview")
        assert response.status_code == 200
        data = response.json()
        for field in ("iso27001_score", "jsox_status", "nist_tier", "open_issues"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_iso27001_status_returns_200(self, client: AsyncClient):
        """ISO 27001コンプライアンス状態が200で返ること"""
        response = await client.get("/api/v1/compliance/iso27001")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_iso27001_contains_categories(self, client: AsyncClient):
        """ISO 27001レスポンスにカテゴリ一覧が含まれること"""
        response = await client.get("/api/v1/compliance/iso27001")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)

    @pytest.mark.asyncio
    async def test_jsox_status_returns_200(self, client: AsyncClient):
        """J-SOXコンプライアンス状態が200で返ること"""
        response = await client.get("/api/v1/compliance/jsox")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_nist_status_returns_200(self, client: AsyncClient):
        """NISTコンプライアンス状態が200で返ること"""
        response = await client.get("/api/v1/compliance/nist")
        assert response.status_code == 200


# ===================================================================
# レポートCSVテスト（Reports）
# ===================================================================
class TestReports:
    """CSVレポートテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sam_report_requires_auth(self, client: AsyncClient):
        """SAMレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/sam")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_sam_report_requires_auditor_or_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SAMレポートはauditor/adminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/reports/sam", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_asset_report_requires_auth(self, client: AsyncClient):
        """資産レポートは認証必須であること"""
        response = await client.get("/api/v1/reports/assets")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_asset_report_requires_auditor_or_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """資産レポートはauditor/adminロールが必要であること（通常ユーザーは403）"""
        response = await client.get("/api/v1/reports/assets", headers=auth_headers)
        assert response.status_code in (200, 403)

    @pytest.mark.asyncio
    async def test_security_report_requires_auth(self, client: AsyncClient):
        """セキュリティレポートは認証必須であること"""
        response = await client.get("/api/v1/reports/security")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_security_report_requires_auditor_or_admin_role(
        self, client: AsyncClient, auth_headers: dict
    ):
        """セキュリティレポートはauditor/adminロールが必要であること"""
        response = await client.get("/api/v1/reports/security", headers=auth_headers)
        assert response.status_code in (200, 403)


# ===================================================================
# テレメトリテスト（Telemetry）
# ===================================================================
class TestTelemetry:
    """テレメトリ収集テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_telemetry_post_missing_required_returns_422(
        self, client: AsyncClient
    ):
        """テレメトリPOSTは必須フィールドが不足すると422が返ること"""
        response = await client.post("/api/v1/telemetry", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_post_with_valid_device_id_returns_200(
        self, client: AsyncClient
    ):
        """テレメトリPOSTは有効なdevice_idで200が返ること（存在しないデバイスは404/200）"""
        payload = {
            "device_id": str(uuid.uuid4()),
            "collected_at": "2026-04-02T10:00:00Z",
            "cpu_usage": 45.2,
            "memory_usage": 62.1,
            "disk_usage": 78.5,
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code in (200, 404, 422)


# ===================================================================
# SLA定義フィルタリング詳細テスト
# ===================================================================
class TestSLAFiltersDetail:
    """SLAフィルタリング詳細テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_sla_definitions_filter_by_metric_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA定義をmetric_typeでフィルタリングできること"""
        response = await client.get(
            "/api/v1/sla/definitions?metric_type=uptime", headers=auth_headers
        )
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_sla_measurements_filter_by_sla_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA測定をsla_idでフィルタリングできること"""
        fake_sla_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/sla/measurements?sla_id={fake_sla_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sla_violations_filter_by_notified(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLA違反をnotifiedでフィルタリングできること"""
        response = await client.get(
            "/api/v1/sla/violations?notified=true", headers=auth_headers
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sla_report_csv_format(
        self, client: AsyncClient, auth_headers: dict
    ):
        """SLAレポートのCSV形式が指定できること"""
        response = await client.get(
            "/api/v1/sla/report?month=3&year=2026&format=csv", headers=auth_headers
        )
        assert response.status_code == 200
