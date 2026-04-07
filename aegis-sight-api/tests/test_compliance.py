"""Tests for the compliance API endpoints."""

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_compliance_overview_unauthorized(client: AsyncClient):
    """Compliance overview is publicly accessible (no auth required for mock)."""
    response = await client.get("/api/v1/compliance/overview")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_compliance_overview_structure(client: AsyncClient):
    """Overview response contains expected top-level fields."""
    response = await client.get("/api/v1/compliance/overview")
    assert response.status_code == 200
    data = response.json()
    assert "iso27001_score" in data
    assert "jsox_status" in data
    assert "nist_tier" in data
    assert "open_issues" in data
    assert isinstance(data["recent_events"], list)
    assert isinstance(data["issues"], list)


@pytest.mark.asyncio
async def test_compliance_overview_scores_range(client: AsyncClient):
    """Scores should be within valid ranges."""
    response = await client.get("/api/v1/compliance/overview")
    data = response.json()
    assert 0 <= data["iso27001_score"] <= 100
    assert 0 <= data["nist_tier"] <= 4
    assert data["open_issues"] >= 0


# ---------------------------------------------------------------------------
# ISO 27001
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_iso27001_status(client: AsyncClient):
    """ISO 27001 endpoint returns categories with scores."""
    response = await client.get("/api/v1/compliance/iso27001")
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert "categories" in data
    assert len(data["categories"]) > 0

    cat = data["categories"][0]
    assert "name" in cat
    assert "score" in cat
    assert "max_score" in cat
    assert "status" in cat


@pytest.mark.asyncio
async def test_iso27001_score_consistency(client: AsyncClient):
    """Overall score should match the average of category scores."""
    response = await client.get("/api/v1/compliance/iso27001")
    data = response.json()
    avg = sum(c["score"] for c in data["categories"]) / len(data["categories"])
    assert abs(data["overall_score"] - round(avg, 1)) < 0.2


# ---------------------------------------------------------------------------
# J-SOX
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_jsox_status(client: AsyncClient):
    """J-SOX endpoint returns ITGC control areas."""
    response = await client.get("/api/v1/compliance/jsox")
    assert response.status_code == 200
    data = response.json()
    assert "overall_status" in data
    assert "controls" in data
    assert len(data["controls"]) == 4

    ctrl = data["controls"][0]
    assert "area" in ctrl
    assert "status" in ctrl
    assert "findings" in ctrl
    assert "remediation_progress" in ctrl


@pytest.mark.asyncio
async def test_jsox_valid_statuses(client: AsyncClient):
    """Control statuses should be one of the allowed values."""
    response = await client.get("/api/v1/compliance/jsox")
    data = response.json()
    valid = {"effective", "partially_effective", "ineffective"}
    for ctrl in data["controls"]:
        assert ctrl["status"] in valid


# ---------------------------------------------------------------------------
# NIST CSF
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nist_status(client: AsyncClient):
    """NIST endpoint returns core function maturity data."""
    response = await client.get("/api/v1/compliance/nist")
    assert response.status_code == 200
    data = response.json()
    assert "overall_tier" in data
    assert "functions" in data
    assert len(data["functions"]) == 6

    fn = data["functions"][0]
    assert "function" in fn
    assert "tier" in fn
    assert "target_tier" in fn
    assert "score" in fn


@pytest.mark.asyncio
async def test_nist_tier_range(client: AsyncClient):
    """Tiers should be between 1 and 4."""
    response = await client.get("/api/v1/compliance/nist")
    data = response.json()
    for fn in data["functions"]:
        assert 1 <= fn["tier"] <= 4
        assert 1 <= fn["target_tier"] <= 4
