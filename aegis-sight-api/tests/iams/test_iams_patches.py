"""
IAMS移植テスト: パッチ管理・脆弱性追跡（Phase11）
変換元: IAMS パッチ管理テスト 105件中82件選定
変換日: 2026-04-02
変換元テスト数: 82件
変換テスト数: 40件（優先度高・CRUD・バリデーション・コンプライアンス集計）
除外テスト数: 42件（エージェント通信依存・WSUS接続依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_UPDATE_SEVERITIES = ["critical", "important", "moderate", "low"]
ALL_PATCH_STATUSES = ["not_installed", "downloading", "installed", "failed", "not_applicable"]
ALL_VULN_SEVERITIES = ["critical", "high", "medium", "low"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestPatchesAuth:
    """パッチ管理API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_updates_list_requires_auth(self, client: AsyncClient):
        """Windowsアップデート一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/updates")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_compliance_requires_auth(self, client: AsyncClient):
        """パッチコンプライアンスサマリーは認証必須であること"""
        response = await client.get("/api/v1/patches/compliance")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_patches_requires_auth(self, client: AsyncClient):
        """未適用パッチ一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/missing")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_vulnerabilities_requires_auth(self, client: AsyncClient):
        """脆弱性一覧は認証必須であること"""
        response = await client.get("/api/v1/patches/vulnerabilities")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_updates_list_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでWindowsアップデート一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/patches/updates", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_readonly_can_access_updates(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """readonlyロールでもアップデート一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/patches/updates", headers=readonly_headers)
        assert response.status_code == 200


# ===================================================================
# Windowsアップデート一覧（Updates List）
# ===================================================================
class TestWindowsUpdatesList:
    """Windowsアップデート一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_updates_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """アップデート一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/updates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_updates_default_limit_is_50(
        self, client: AsyncClient, auth_headers: dict
    ):
        """デフォルトのlimitが50であること"""
        response = await client.get("/api/v1/patches/updates", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["limit"] == 50

    @pytest.mark.asyncio
    async def test_updates_limit_over_200_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """limit>200で422が返ること"""
        response = await client.get(
            "/api/v1/patches/updates?limit=201", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("severity", ALL_UPDATE_SEVERITIES)
    async def test_filter_by_severity(
        self, client: AsyncClient, auth_headers: dict, severity: str
    ):
        """重大度フィルタが機能すること（0件も許容）"""
        response = await client.get(
            f"/api/v1/patches/updates?severity={severity}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["severity"] == severity

    @pytest.mark.asyncio
    async def test_invalid_severity_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な重大度で422が返ること"""
        response = await client.get(
            "/api/v1/patches/updates?severity=invalid", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# Windowsアップデート作成（Update Creation）
# ===================================================================
class TestWindowsUpdateCreation:
    """Windowsアップデート作成テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_create_update_requires_auth(self, client: AsyncClient):
        """アップデート作成は認証必須であること"""
        response = await client.post(
            "/api/v1/patches/updates",
            json={
                "kb_number": "KB5000001",
                "title": "テストアップデート",
                "severity": "critical",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_update_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/patches/updates",
            json={"title": "タイトルのみ"},  # kb_number, severity欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("severity", ALL_UPDATE_SEVERITIES)
    async def test_create_update_all_severities(
        self, client: AsyncClient, auth_headers: dict, severity: str
    ):
        """全重大度でWindowsアップデートを作成できること"""
        import random
        kb_number = f"KB{random.randint(9000000, 9999999)}-{severity}"
        response = await client.post(
            "/api/v1/patches/updates",
            json={
                "kb_number": kb_number,
                "title": f"IAMS移植テスト-{severity}",
                "severity": severity,
                "release_date": "2026-04-02T00:00:00Z",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"severity={severity}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_update_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したアップデートのレスポンスに必須フィールドが含まれること"""
        import random
        kb_number = f"KB{random.randint(1000000, 8999999)}-fields"
        response = await client.post(
            "/api/v1/patches/updates",
            json={
                "kb_number": kb_number,
                "title": "IAMS移植テスト-フィールド確認",
                "severity": "moderate",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "kb_number", "title", "severity"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_duplicate_kb_number_returns_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """重複KBナンバーで4xxが返ること"""
        import random
        kb_number = f"KB{random.randint(1000000, 1999999)}-dup"
        payload = {
            "kb_number": kb_number,
            "title": "重複テスト",
            "severity": "low",
        }
        # 1回目
        await client.post("/api/v1/patches/updates", json=payload, headers=auth_headers)
        # 2回目（重複）
        response = await client.post(
            "/api/v1/patches/updates", json=payload, headers=auth_headers
        )
        assert response.status_code in (400, 409), (
            f"Duplicate KB should return 400 or 409, got {response.status_code}"
        )


# ===================================================================
# パッチコンプライアンスサマリー（Compliance Summary）
# ===================================================================
class TestPatchComplianceSummary:
    """パッチコンプライアンステスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_compliance_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """コンプライアンスサマリーに必須フィールドが含まれること"""
        response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in (
            "total_devices", "total_updates", "fully_patched_devices",
            "compliance_rate", "critical_missing",
        ):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_compliance_rate_is_float(
        self, client: AsyncClient, auth_headers: dict
    ):
        """compliance_rateが数値型であること"""
        response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json()["compliance_rate"], (int, float))

    @pytest.mark.asyncio
    async def test_compliance_counts_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """全カウント値が非負であること"""
        response = await client.get("/api/v1/patches/compliance", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("total_devices", "total_updates", "fully_patched_devices",
                      "critical_missing", "important_missing", "moderate_missing", "low_missing"):
            assert data[field] >= 0, f"Negative value for {field}"


# ===================================================================
# 未適用パッチ一覧（Missing Patches）
# ===================================================================
class TestMissingPatches:
    """未適用パッチ一覧テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_missing_patches_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """未適用パッチ一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/patches/missing", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_device_patches_not_found_for_unknown(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないデバイスのパッチ一覧で404が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/patches/devices/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_device_patches_invalid_uuid_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なUUID形式で422が返ること"""
        response = await client.get(
            "/api/v1/patches/devices/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# 脆弱性管理（Vulnerability Management）
# ===================================================================
class TestVulnerabilityManagement:
    """脆弱性管理テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_vulnerabilities_returns_paginated(
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
    @pytest.mark.parametrize("severity", ALL_VULN_SEVERITIES)
    async def test_filter_vulnerabilities_by_severity(
        self, client: AsyncClient, auth_headers: dict, severity: str
    ):
        """重大度フィルタが機能すること（0件も許容）"""
        response = await client.get(
            f"/api/v1/patches/vulnerabilities?severity={severity}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["severity"] == severity

    @pytest.mark.asyncio
    async def test_filter_vulnerabilities_by_is_resolved(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_resolvedフィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/patches/vulnerabilities?is_resolved=false", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_resolved"] is False

    @pytest.mark.asyncio
    async def test_create_vulnerability_missing_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で422が返ること"""
        response = await client.post(
            "/api/v1/patches/vulnerabilities",
            json={"title": "タイトルのみ"},  # cve_id, severity欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("severity", ALL_VULN_SEVERITIES)
    async def test_create_vulnerability_all_severities(
        self, client: AsyncClient, auth_headers: dict, severity: str
    ):
        """全重大度で脆弱性を作成できること"""
        import random
        cve_id = f"CVE-2026-{random.randint(10000, 99999)}"
        response = await client.post(
            "/api/v1/patches/vulnerabilities",
            json={
                "cve_id": cve_id,
                "title": f"IAMS移植テスト脆弱性-{severity}",
                "severity": severity,
                "cvss_score": 7.5,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"severity={severity}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_vulnerability_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成した脆弱性レスポンスに必須フィールドが含まれること"""
        import random
        cve_id = f"CVE-2026-{random.randint(100000, 199999)}"
        response = await client.post(
            "/api/v1/patches/vulnerabilities",
            json={
                "cve_id": cve_id,
                "title": "IAMS移植テスト-フィールド確認",
                "severity": "high",
                "cvss_score": 8.0,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        for field in ("id", "cve_id", "title", "severity", "is_resolved"):
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

    @pytest.mark.asyncio
    async def test_create_duplicate_cve_returns_error(
        self, client: AsyncClient, auth_headers: dict
    ):
        """重複CVE IDで4xxが返ること"""
        import random
        cve_id = f"CVE-2026-{random.randint(200000, 299999)}"
        payload = {
            "cve_id": cve_id,
            "title": "重複テスト",
            "severity": "medium",
            "cvss_score": 5.0,
        }
        await client.post("/api/v1/patches/vulnerabilities", json=payload, headers=auth_headers)
        response = await client.post(
            "/api/v1/patches/vulnerabilities", json=payload, headers=auth_headers
        )
        assert response.status_code in (400, 409), (
            f"Duplicate CVE should return 400 or 409, got {response.status_code}"
        )
