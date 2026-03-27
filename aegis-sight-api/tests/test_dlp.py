"""DLP API endpoint tests."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dlp import DLPAction, DLPRule, DLPRuleType, DLPSeverity


async def _create_dlp_rule(
    db: AsyncSession,
    name: str = "test-rule",
    rule_type: DLPRuleType = DLPRuleType.file_extension,
    pattern: str = ".exe,.msi",
    action: DLPAction = DLPAction.alert,
    severity: DLPSeverity = DLPSeverity.high,
    is_enabled: bool = True,
) -> DLPRule:
    """Helper to insert a test DLP rule."""
    rule = DLPRule(
        name=name,
        rule_type=rule_type,
        pattern=pattern,
        action=action,
        severity=severity,
        is_enabled=is_enabled,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


# ---------------------------------------------------------------------------
# DLP Rule CRUD tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_dlp_rules_unauthorized(client: AsyncClient):
    """Test that listing DLP rules requires authentication."""
    response = await client.get("/api/v1/dlp/rules")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_dlp_rules(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test listing DLP rules with authentication."""
    await _create_dlp_rule(db_session, name=f"rule-list-{uuid.uuid4().hex[:6]}")
    response = await client.get("/api/v1/dlp/rules", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_dlp_rule(client: AsyncClient, auth_headers: dict):
    """Test creating a new DLP rule."""
    payload = {
        "name": f"new-rule-{uuid.uuid4().hex[:6]}",
        "description": "Test rule",
        "rule_type": "file_extension",
        "pattern": ".exe,.msi",
        "action": "alert",
        "severity": "high",
        "is_enabled": True,
    }
    response = await client.post("/api/v1/dlp/rules", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["rule_type"] == "file_extension"
    assert data["action"] == "alert"
    assert data["severity"] == "high"
    assert data["is_enabled"] is True


@pytest.mark.asyncio
async def test_update_dlp_rule(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test updating an existing DLP rule."""
    rule = await _create_dlp_rule(
        db_session, name=f"update-rule-{uuid.uuid4().hex[:6]}"
    )
    payload = {"name": "updated-name", "is_enabled": False}
    response = await client.patch(
        f"/api/v1/dlp/rules/{rule.id}", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "updated-name"
    assert data["is_enabled"] is False


@pytest.mark.asyncio
async def test_update_dlp_rule_not_found(client: AsyncClient, auth_headers: dict):
    """Test updating a non-existent DLP rule returns 404."""
    payload = {"name": "ghost"}
    response = await client.patch(
        "/api/v1/dlp/rules/00000000-0000-0000-0000-000000000000",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_dlp_rule(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test deleting a DLP rule."""
    rule = await _create_dlp_rule(
        db_session, name=f"del-rule-{uuid.uuid4().hex[:6]}"
    )
    response = await client.delete(
        f"/api/v1/dlp/rules/{rule.id}", headers=auth_headers
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_dlp_rule_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent DLP rule returns 404."""
    response = await client.delete(
        "/api/v1/dlp/rules/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DLP Events tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_dlp_events(client: AsyncClient, auth_headers: dict):
    """Test listing DLP events (empty initially)."""
    response = await client.get("/api/v1/dlp/events", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_dlp_event_summary(client: AsyncClient, auth_headers: dict):
    """Test DLP event summary endpoint."""
    response = await client.get("/api/v1/dlp/events/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_events" in data
    assert "blocked" in data
    assert "alerted" in data
    assert "logged" in data
    assert "by_severity" in data
    assert "by_rule_type" in data


# ---------------------------------------------------------------------------
# DLP Evaluate tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_evaluate_no_match(client: AsyncClient, auth_headers: dict):
    """Test evaluation with no matching rules."""
    payload = {
        "file_path": "/home/user/documents/report.pdf",
        "file_name": "report.pdf",
        "file_size": 1024,
        "user_name": "test_user",
    }
    response = await client.post(
        "/api/v1/dlp/evaluate", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matched"] is False
    assert data["events_created"] == 0


@pytest.mark.asyncio
async def test_evaluate_file_extension_match(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test evaluation matching a file extension rule."""
    await _create_dlp_rule(
        db_session,
        name=f"eval-ext-{uuid.uuid4().hex[:6]}",
        rule_type=DLPRuleType.file_extension,
        pattern=".exe,.msi",
        action=DLPAction.block,
        severity=DLPSeverity.critical,
    )
    payload = {
        "file_path": "E:\\tools\\setup.exe",
        "file_name": "setup.exe",
        "file_size": 5242880,
        "user_name": "tanaka",
    }
    response = await client.post(
        "/api/v1/dlp/evaluate", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matched"] is True
    assert data["events_created"] >= 1
    assert "block" in data["actions"]


@pytest.mark.asyncio
async def test_evaluate_size_limit_match(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test evaluation matching a size limit rule."""
    await _create_dlp_rule(
        db_session,
        name=f"eval-size-{uuid.uuid4().hex[:6]}",
        rule_type=DLPRuleType.size_limit,
        pattern="1048576",  # 1MB
        action=DLPAction.alert,
        severity=DLPSeverity.medium,
    )
    payload = {
        "file_path": "/tmp/bigfile.zip",
        "file_name": "bigfile.zip",
        "file_size": 10485760,  # 10MB > 1MB
        "user_name": "suzuki",
    }
    response = await client.post(
        "/api/v1/dlp/evaluate", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matched"] is True
    assert "alert" in data["actions"]


@pytest.mark.asyncio
async def test_evaluate_keyword_match(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test evaluation matching a content keyword rule."""
    await _create_dlp_rule(
        db_session,
        name=f"eval-kw-{uuid.uuid4().hex[:6]}",
        rule_type=DLPRuleType.content_keyword,
        pattern="password,credential",
        action=DLPAction.block,
        severity=DLPSeverity.critical,
    )
    payload = {
        "file_path": "C:\\Users\\admin\\Desktop\\password_list.txt",
        "file_name": "password_list.txt",
        "file_size": 512,
        "user_name": "admin",
    }
    response = await client.post(
        "/api/v1/dlp/evaluate", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matched"] is True
    assert "block" in data["actions"]


@pytest.mark.asyncio
async def test_evaluate_disabled_rule_skipped(
    client: AsyncClient, auth_headers: dict, db_session: AsyncSession
):
    """Test that disabled rules are not evaluated."""
    await _create_dlp_rule(
        db_session,
        name=f"eval-disabled-{uuid.uuid4().hex[:6]}",
        rule_type=DLPRuleType.file_extension,
        pattern=".dangerous",
        action=DLPAction.block,
        severity=DLPSeverity.critical,
        is_enabled=False,
    )
    payload = {
        "file_path": "/tmp/test.dangerous",
        "file_name": "test.dangerous",
        "file_size": 100,
        "user_name": "user",
    }
    response = await client.post(
        "/api/v1/dlp/evaluate", json=payload, headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    # The disabled rule should not match
    # (other rules from previous tests might match, so just check this specific pattern)
    matched_patterns = [r["pattern"] for r in data.get("matched_rules", [])]
    assert ".dangerous" not in matched_patterns
