"""
IAMS移植テスト: ヘルスチェック・バージョン情報・メトリクス・テレメトリー（Phase59相当）
変換元: IAMS システム基盤テスト 約65件中36件選定
変換日: 2026-04-02
変換テスト数: 36件（ヘルス詳細/バージョン全フィールド/Prometheusメトリクス/テレメトリーCRUD）
除外テスト数: 29件（OSメトリクスデーモン依存・エージェント実行依存・Celery/Redis実装依存）
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams


# ===================================================================
# ヘルスチェックテスト（Health）
# ===================================================================
class TestHealth:
    """ヘルスチェックテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_health_no_auth_required(self, client: AsyncClient):
        """ヘルスチェックは認証不要であること"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_status_is_ok(self, client: AsyncClient):
        """ヘルスチェックのstatusがokであること"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_health_has_version_field(self, client: AsyncClient):
        """ヘルスチェックレスポンスにversionフィールドが含まれること"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health_has_database_field(self, client: AsyncClient):
        """ヘルスチェックレスポンスにdatabaseフィールドが含まれること"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "database" in data

    @pytest.mark.asyncio
    async def test_health_database_is_healthy(self, client: AsyncClient):
        """テスト環境でのデータベース接続が正常であること"""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["database"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_detail_no_auth_required(self, client: AsyncClient):
        """ヘルス詳細は認証不要であること（公開エンドポイント）"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_detail_has_status_field(self, client: AsyncClient):
        """ヘルス詳細レスポンスにstatusフィールドが含まれること"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    @pytest.mark.asyncio
    async def test_health_detail_has_version_field(self, client: AsyncClient):
        """ヘルス詳細レスポンスにversionフィールドが含まれること"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health_detail_has_checks_field(self, client: AsyncClient):
        """ヘルス詳細レスポンスにchecksフィールドが含まれること"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 200
        data = response.json()
        assert "checks" in data
        assert isinstance(data["checks"], dict)

    @pytest.mark.asyncio
    async def test_health_detail_checks_has_database(self, client: AsyncClient):
        """ヘルス詳細のchecksにdatabaseチェックが含まれること"""
        response = await client.get("/api/v1/health/detail")
        assert response.status_code == 200
        data = response.json()
        assert "database" in data["checks"]

    @pytest.mark.asyncio
    async def test_health_ready_no_auth_required(self, client: AsyncClient):
        """レディネスプローブは認証不要であること"""
        response = await client.get("/api/v1/health/ready")
        assert response.status_code in (200, 503)

    @pytest.mark.asyncio
    async def test_health_ready_has_status_field(self, client: AsyncClient):
        """レディネスプローブレスポンスにstatusフィールドが含まれること"""
        response = await client.get("/api/v1/health/ready")
        assert response.status_code in (200, 503)
        data = response.json()
        assert "status" in data


# ===================================================================
# バージョン情報テスト（Version）
# ===================================================================
class TestVersion:
    """バージョン情報テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_version_no_auth_required(self, client: AsyncClient):
        """バージョン情報は認証不要であること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_version_has_api_version(self, client: AsyncClient):
        """バージョン情報にapi_versionフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "api_version" in data

    @pytest.mark.asyncio
    async def test_version_has_app_version(self, client: AsyncClient):
        """バージョン情報にapp_versionフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "app_version" in data

    @pytest.mark.asyncio
    async def test_version_has_python_version(self, client: AsyncClient):
        """バージョン情報にpython_versionフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "python_version" in data

    @pytest.mark.asyncio
    async def test_version_has_build_date(self, client: AsyncClient):
        """バージョン情報にbuild_dateフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "build_date" in data

    @pytest.mark.asyncio
    async def test_version_has_git_commit_hash(self, client: AsyncClient):
        """バージョン情報にgit_commit_hashフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "git_commit_hash" in data

    @pytest.mark.asyncio
    async def test_version_has_minimum_agent_version(self, client: AsyncClient):
        """バージョン情報にminimum_agent_versionフィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        assert "minimum_agent_version" in data

    @pytest.mark.asyncio
    async def test_version_has_all_required_fields(self, client: AsyncClient):
        """バージョン情報に全必須フィールドが含まれること"""
        response = await client.get("/api/v1/version")
        assert response.status_code == 200
        data = response.json()
        for field in (
            "api_version",
            "app_version",
            "python_version",
            "build_date",
            "git_commit_hash",
            "minimum_agent_version",
        ):
            assert field in data, f"Missing field: {field}"


# ===================================================================
# Prometheusメトリクステスト（Metrics）
# ===================================================================
class TestMetrics:
    """Prometheusメトリクステスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_metrics_no_auth_required(self, client: AsyncClient):
        """メトリクスエンドポイントは認証不要であること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_metrics_returns_plaintext(self, client: AsyncClient):
        """メトリクスエンドポイントがtext/plain形式で返ること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_metrics_response_not_empty(self, client: AsyncClient):
        """メトリクスレスポンスが空でないこと"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert len(response.text) > 0

    @pytest.mark.asyncio
    async def test_metrics_contains_http_requests_metric(self, client: AsyncClient):
        """メトリクスにHTTPリクエストカウンターが含まれること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert "aegis_http_requests_total" in response.text

    @pytest.mark.asyncio
    async def test_metrics_contains_active_devices_metric(self, client: AsyncClient):
        """メトリクスにアクティブデバイスゲージが含まれること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert "aegis_active_devices_total" in response.text

    @pytest.mark.asyncio
    async def test_metrics_contains_prometheus_format_markers(
        self, client: AsyncClient
    ):
        """メトリクスレスポンスにPrometheus形式マーカーが含まれること"""
        response = await client.get("/api/v1/metrics")
        assert response.status_code == 200
        assert "# HELP" in response.text or "# TYPE" in response.text


# ===================================================================
# テレメトリーテスト（Telemetry）
# ===================================================================
class TestTelemetry:
    """テレメトリーテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_telemetry_missing_body_returns_422(self, client: AsyncClient):
        """テレメトリー送信に必須フィールドが欠けると422が返ること（認証不要エンドポイント）"""
        response = await client.post("/api/v1/telemetry", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_missing_device_info_returns_422(
        self, client: AsyncClient
    ):
        """device_infoフィールドが欠けると422が返ること"""
        response = await client.post(
            "/api/v1/telemetry",
            json={"collected_at": datetime.now(timezone.utc).isoformat()},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_missing_collected_at_returns_422(
        self, client: AsyncClient
    ):
        """collected_atフィールドが欠けると422が返ること"""
        response = await client.post(
            "/api/v1/telemetry",
            json={"device_info": {"hostname": "test-host"}},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_missing_hostname_returns_422(self, client: AsyncClient):
        """device_info.hostnameが欠けると422が返ること"""
        response = await client.post(
            "/api/v1/telemetry",
            json={
                "device_info": {},
                "collected_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_telemetry_valid_minimal_payload_returns_200(
        self, client: AsyncClient
    ):
        """必須フィールドのみのテレメトリーデータで200が返ること"""
        payload = {
            "device_info": {"hostname": "iams-test-phase111"},
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_telemetry_response_has_status_accepted(self, client: AsyncClient):
        """テレメトリーレスポンスのstatusがacceptedであること"""
        payload = {
            "device_info": {"hostname": "iams-test-status-check"},
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_telemetry_response_has_device_id(self, client: AsyncClient):
        """テレメトリーレスポンスにdevice_idが含まれること"""
        payload = {
            "device_info": {"hostname": "iams-test-device-id"},
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "device_id" in data

    @pytest.mark.asyncio
    async def test_telemetry_response_has_hostname(self, client: AsyncClient):
        """テレメトリーレスポンスにhostnameが含まれること"""
        payload = {
            "device_info": {"hostname": "iams-test-hostname"},
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["hostname"] == "iams-test-hostname"

    @pytest.mark.asyncio
    async def test_telemetry_with_hardware_info_returns_200(
        self, client: AsyncClient
    ):
        """ハードウェア情報付きテレメトリーデータで200が返ること"""
        payload = {
            "device_info": {"hostname": "iams-test-hardware"},
            "hardware": {
                "cpu_model": "Intel Core i7",
                "memory_gb": 16.0,
                "disk_total_gb": 512.0,
                "disk_free_gb": 200.0,
            },
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_telemetry_with_software_inventory_returns_200(
        self, client: AsyncClient
    ):
        """ソフトウェアインベントリ付きテレメトリーデータで200が返ること"""
        payload = {
            "device_info": {"hostname": "iams-test-software"},
            "software_inventory": [
                {"name": "Microsoft Office", "version": "2021"},
                {"name": "Google Chrome", "version": "120.0"},
            ],
            "collected_at": datetime.now(timezone.utc).isoformat(),
        }
        response = await client.post("/api/v1/telemetry", json=payload)
        assert response.status_code == 200
