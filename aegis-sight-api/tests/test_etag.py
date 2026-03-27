"""Tests for ETag middleware -- conditional responses and caching headers."""

import hashlib

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_response_includes_etag(client: AsyncClient):
    """GET requests should include an ETag header."""
    response = await client.get("/docs")
    assert response.status_code == 200
    assert "etag" in response.headers


@pytest.mark.asyncio
async def test_etag_returns_304_on_match(client: AsyncClient):
    """When If-None-Match matches the ETag, return 304 Not Modified."""
    first = await client.get("/openapi.json")
    assert first.status_code == 200
    etag = first.headers.get("etag")
    assert etag is not None

    second = await client.get("/openapi.json", headers={"If-None-Match": etag})
    assert second.status_code == 304


@pytest.mark.asyncio
async def test_etag_returns_200_on_mismatch(client: AsyncClient):
    """When If-None-Match does NOT match, return 200 with full body."""
    response = await client.get("/openapi.json", headers={"If-None-Match": '"stale"'})
    assert response.status_code == 200
    assert "etag" in response.headers


@pytest.mark.asyncio
async def test_cache_control_header(client: AsyncClient):
    """Response should include Cache-Control with max-age."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    cache_control = response.headers.get("cache-control", "")
    assert "max-age=" in cache_control


@pytest.mark.asyncio
async def test_etag_excluded_path_no_etag(client: AsyncClient):
    """Excluded paths (e.g. /health) should NOT have an ETag header."""
    response = await client.get("/health")
    assert response.status_code == 200
    # /health is in the exclude list, so no ETag
    assert "etag" not in response.headers


@pytest.mark.asyncio
async def test_etag_is_md5_of_body(client: AsyncClient):
    """ETag value should be the MD5 hex digest of the response body, quoted."""
    response = await client.get("/openapi.json")
    body = response.content
    expected = f'"{hashlib.md5(body).hexdigest()}"'  # noqa: S324
    assert response.headers["etag"] == expected


@pytest.mark.asyncio
async def test_post_request_no_etag(client: AsyncClient):
    """POST requests should NOT receive ETag processing."""
    response = await client.post("/api/v1/auth/login", json={"email": "x", "password": "y"})
    # Regardless of status, there should be no ETag on non-GET
    assert "etag" not in response.headers
