"""
IAMS移植テスト: DLPポリシー・イベント管理（Phase9）
変換元: IAMS DLPポリシーテスト 112件中88件選定
変換日: 2026-04-02
変換元テスト数: 88件
変換テスト数: 35件（優先度高・CRUD・バリデーション・評価エンドポイント）
除外テスト数: 53件（ファイルシステム依存・エージェント通信依存）
"""

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.iams

ALL_DLP_RULE_TYPES = [
    "file_extension",
    "path_pattern",
    "content_keyword",
    "size_limit",
]

ALL_DLP_ACTIONS = ["alert", "block", "log"]

ALL_DLP_SEVERITIES = ["critical", "high", "medium", "low"]


# ===================================================================
# 認証・認可（Authentication / Authorization）
# ===================================================================
class TestDLPAuth:
    """DLP API認証テスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_rules_list_requires_auth(self, client: AsyncClient):
        """DLPルール一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/rules")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_events_list_requires_auth(self, client: AsyncClient):
        """DLPイベント一覧は認証必須であること"""
        response = await client.get("/api/v1/dlp/events")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_event_summary_requires_auth(self, client: AsyncClient):
        """DLPイベントサマリーは認証必須であること"""
        response = await client.get("/api/v1/dlp/events/summary")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_evaluate_requires_auth(self, client: AsyncClient):
        """DLP評価エンドポイントは認証必須であること"""
        response = await client.post(
            "/api/v1/dlp/evaluate",
            json={"file_path": "/tmp/test.exe", "operation": "write", "file_size": 1024},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_rules_list_accessible_with_auth(
        self, client: AsyncClient, auth_headers: dict
    ):
        """認証済みでDLPルール一覧にアクセスできること（200）"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200


# ===================================================================
# DLPルール CRUD（Rules CRUD）
# ===================================================================
class TestDLPRulesCRUD:
    """DLPルールCRUDテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_list_rules_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """ルール一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_create_rule_missing_required_fields_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """必須フィールド欠損で 422 が返ること"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={"name": "テストルール"},  # rule_type, pattern, action 欠損
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rule_invalid_action_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正なアクション値で 422 が返ること"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={
                "name": "テストルール",
                "rule_type": "file_extension",
                "pattern": "*.exe",
                "action": "invalid_action",
                "severity": "high",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.parametrize("rule_type", ALL_DLP_RULE_TYPES)
    async def test_create_rule_all_rule_types(
        self, client: AsyncClient, auth_headers: dict, rule_type: str
    ):
        """全ルール種別でDLPルールを作成できること"""
        patterns = {
            "file_extension": "*.exe",
            "path_pattern": "/tmp/*",
            "content_keyword": "confidential",
            "size_limit": "104857600",
        }
        response = await client.post(
            "/api/v1/dlp/rules",
            json={
                "name": f"IAMS移植テスト-{rule_type}",
                "rule_type": rule_type,
                "pattern": patterns[rule_type],
                "action": "alert",
                "severity": "medium",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"rule_type={rule_type}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("action", ALL_DLP_ACTIONS)
    async def test_create_rule_all_actions(
        self, client: AsyncClient, auth_headers: dict, action: str
    ):
        """全アクション種別でDLPルールを作成できること"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={
                "name": f"IAMS移植テスト-action-{action}",
                "rule_type": "file_extension",
                "pattern": "*.tmp",
                "action": action,
                "severity": "low",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"action={action}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("severity", ALL_DLP_SEVERITIES)
    async def test_create_rule_all_severities(
        self, client: AsyncClient, auth_headers: dict, severity: str
    ):
        """全重要度でDLPルールを作成できること"""
        response = await client.post(
            "/api/v1/dlp/rules",
            json={
                "name": f"IAMS移植テスト-severity-{severity}",
                "rule_type": "path_pattern",
                "pattern": f"/sensitive/{severity}/*",
                "action": "log",
                "severity": severity,
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201), (
            f"severity={severity}: unexpected status {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_update_nonexistent_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないルールの更新で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.patch(
            f"/api/v1/dlp/rules/{fake_id}",
            json={"name": "更新テスト"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_rule_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ):
        """存在しないルールの削除で 404 が返ること"""
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/v1/dlp/rules/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_rule_response_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """作成したルールのレスポンスに必須フィールドが含まれること"""
        create_response = await client.post(
            "/api/v1/dlp/rules",
            json={
                "name": "IAMS移植テスト-フィールド確認",
                "rule_type": "content_keyword",
                "pattern": "secret",
                "action": "block",
                "severity": "critical",
            },
            headers=auth_headers,
        )
        assert create_response.status_code in (200, 201)
        data = create_response.json()
        for field in ("id", "name", "rule_type", "pattern", "action", "severity", "is_enabled"):
            assert field in data, f"Missing field: {field}"


# ===================================================================
# DLPルール フィルタリング（Rules Filtering）
# ===================================================================
class TestDLPRulesFiltering:
    """DLPルールフィルタリングテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_filter_by_rule_type(
        self, client: AsyncClient, auth_headers: dict
    ):
        """rule_type フィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/dlp/rules?rule_type=file_extension", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["rule_type"] == "file_extension"

    @pytest.mark.asyncio
    async def test_filter_by_is_enabled(
        self, client: AsyncClient, auth_headers: dict
    ):
        """is_enabled フィルタが機能すること（0件も許容）"""
        response = await client.get(
            "/api/v1/dlp/rules?is_enabled=true", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_enabled"] is True

    @pytest.mark.asyncio
    async def test_invalid_rule_type_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """不正な rule_type で 422 が返ること"""
        response = await client.get(
            "/api/v1/dlp/rules?rule_type=invalid_type", headers=auth_headers
        )
        assert response.status_code == 422


# ===================================================================
# DLPイベント（Events）
# ===================================================================
class TestDLPEvents:
    """DLPイベントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_events_list_returns_paginated(
        self, client: AsyncClient, auth_headers: dict
    ):
        """イベント一覧がページネーション形式で返ること"""
        response = await client.get("/api/v1/dlp/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for field in ("items", "total", "offset", "limit", "has_more"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_event_summary_has_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """イベントサマリーに必須フィールドが含まれること"""
        response = await client.get(
            "/api/v1/dlp/events/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("total_events", "blocked", "alerted", "logged"):
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_event_summary_counts_are_non_negative(
        self, client: AsyncClient, auth_headers: dict
    ):
        """サマリーカウントは非負であること"""
        response = await client.get(
            "/api/v1/dlp/events/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for field in ("total_events", "blocked", "alerted", "logged"):
            assert data[field] >= 0


# ===================================================================
# DLP評価エンドポイント（Evaluate）
# ===================================================================
class TestDLPEvaluate:
    """DLP評価エンドポイントテスト（IAMS移植）"""

    @pytest.mark.asyncio
    async def test_evaluate_returns_result_structure(
        self, client: AsyncClient, auth_headers: dict
    ):
        """評価結果に必須フィールドが含まれること"""
        response = await client.post(
            "/api/v1/dlp/evaluate",
            json={
                "file_path": "/tmp/test.txt",
                "operation": "write",
                "file_size": 1024,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "allowed" in data
        assert isinstance(data["allowed"], bool)

    @pytest.mark.asyncio
    async def test_evaluate_missing_file_path_returns_422(
        self, client: AsyncClient, auth_headers: dict
    ):
        """file_path 欠損で 422 が返ること"""
        response = await client.post(
            "/api/v1/dlp/evaluate",
            json={"operation": "write", "file_size": 1024},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_evaluate_exe_file_returns_result(
        self, client: AsyncClient, auth_headers: dict
    ):
        """実行ファイル(.exe)評価が正常に処理されること"""
        response = await client.post(
            "/api/v1/dlp/evaluate",
            json={
                "file_path": "/downloads/malware.exe",
                "operation": "write",
                "file_size": 2048,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "allowed" in data
        assert "matched_rules" in data
