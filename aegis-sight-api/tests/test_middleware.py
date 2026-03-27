"""Tests for custom middleware.

Covers:
  - RequestTimingMiddleware adds X-Process-Time header
  - RequestLoggingMiddleware logs request/response info
"""

from __future__ import annotations

import logging

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Test: RequestTimingMiddleware
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_timing_header_present(client: AsyncClient):
    """Every response should include the X-Process-Time header."""
    response = await client.get("/health")
    assert response.status_code in (200, 503)
    assert "x-process-time" in response.headers
    # Value should be a parseable float
    process_time = float(response.headers["x-process-time"])
    assert process_time >= 0


@pytest.mark.asyncio
async def test_timing_header_on_404(client: AsyncClient):
    """X-Process-Time is present even for 404 responses."""
    response = await client.get("/nonexistent-route")
    assert "x-process-time" in response.headers
    process_time = float(response.headers["x-process-time"])
    assert process_time >= 0


@pytest.mark.asyncio
async def test_timing_header_on_api_route(client: AsyncClient, auth_headers: dict):
    """X-Process-Time is present on authenticated API routes."""
    response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert "x-process-time" in response.headers


# ---------------------------------------------------------------------------
# Test: RequestLoggingMiddleware
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_request_logging(client: AsyncClient, caplog):
    """Request and response are logged at INFO level."""
    with caplog.at_level(logging.INFO, logger="app.core.middleware"):
        await client.get("/health")

    messages = [r.message for r in caplog.records]
    # Check that at least one log entry mentions the request path
    request_logged = any("Request:" in m and "/health" in m for m in messages)
    response_logged = any("Response:" in m and "/health" in m for m in messages)
    assert request_logged, f"Expected request log for /health, got: {messages}"
    assert response_logged, f"Expected response log for /health, got: {messages}"


@pytest.mark.asyncio
async def test_request_logging_includes_method(client: AsyncClient, caplog):
    """Log entries include the HTTP method."""
    with caplog.at_level(logging.INFO, logger="app.core.middleware"):
        await client.get("/health")

    messages = " ".join(r.message for r in caplog.records)
    assert "GET" in messages
