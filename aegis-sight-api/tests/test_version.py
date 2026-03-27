"""
Tests for the ``GET /api/v1/version`` endpoint.
"""

import sys

import pytest
from httpx import AsyncClient

from app.api.v1.version import API_VERSION, MINIMUM_AGENT_VERSION
from app.core.config import settings


@pytest.mark.asyncio
async def test_version_endpoint_returns_200(client: AsyncClient):
    """GET /api/v1/version should return 200."""
    response = await client.get("/api/v1/version")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_version_contains_required_fields(client: AsyncClient):
    """Response must include all documented fields."""
    response = await client.get("/api/v1/version")
    data = response.json()
    required_fields = {
        "api_version",
        "app_version",
        "python_version",
        "build_date",
        "git_commit_hash",
        "minimum_agent_version",
    }
    assert required_fields.issubset(data.keys())


@pytest.mark.asyncio
async def test_version_values_correct(client: AsyncClient):
    """Verify that static version fields match the source constants."""
    response = await client.get("/api/v1/version")
    data = response.json()
    assert data["api_version"] == API_VERSION
    assert data["app_version"] == settings.APP_VERSION
    assert data["minimum_agent_version"] == MINIMUM_AGENT_VERSION


@pytest.mark.asyncio
async def test_version_python_version_matches_runtime(client: AsyncClient):
    """Python version in response should match the running interpreter."""
    response = await client.get("/api/v1/version")
    data = response.json()
    expected = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    assert data["python_version"] == expected


@pytest.mark.asyncio
async def test_version_build_date_format(client: AsyncClient):
    """build_date should be a valid ISO-8601 string ending with Z."""
    response = await client.get("/api/v1/version")
    data = response.json()
    assert data["build_date"].endswith("Z")
    # Should be parseable
    from datetime import datetime

    datetime.strptime(data["build_date"], "%Y-%m-%dT%H:%M:%SZ")


@pytest.mark.asyncio
async def test_version_does_not_require_auth(client: AsyncClient):
    """Version endpoint must be publicly accessible."""
    response = await client.get("/api/v1/version")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_version_git_commit_hash_is_string(client: AsyncClient):
    """git_commit_hash should be a non-empty string."""
    response = await client.get("/api/v1/version")
    data = response.json()
    assert isinstance(data["git_commit_hash"], str)
    assert len(data["git_commit_hash"]) > 0
