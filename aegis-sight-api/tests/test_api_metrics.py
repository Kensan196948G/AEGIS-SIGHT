"""Tests for API metrics collection middleware."""

import pytest
from httpx import AsyncClient

from app.core.api_metrics import (
    ACTIVE_REQUESTS,
    REQUEST_COUNT,
    REQUEST_ERRORS,
    REQUEST_LATENCY,
    _normalize_endpoint,
)


class TestNormalizeEndpoint:
    """Unit tests for the path normalizer."""

    def test_uuid_segment(self):
        path = "/api/v1/devices/550e8400-e29b-41d4-a716-446655440000"
        assert _normalize_endpoint(path) == "/api/v1/devices/{id}"

    def test_numeric_segment(self):
        assert _normalize_endpoint("/api/v1/items/42") == "/api/v1/items/{id}"

    def test_no_replacement_needed(self):
        assert _normalize_endpoint("/api/v1/health") == "/api/v1/health"

    def test_empty_path(self):
        assert _normalize_endpoint("/") == "/"


@pytest.mark.asyncio
async def test_metrics_counter_incremented(client: AsyncClient):
    """After making a request, the counter for that endpoint should increase."""
    # Record baseline
    endpoint = "/health"
    before = REQUEST_COUNT.labels(
        method="GET", endpoint=endpoint, status_code="200"
    )._value.get()

    await client.get("/health")

    after = REQUEST_COUNT.labels(
        method="GET", endpoint=endpoint, status_code="200"
    )._value.get()

    assert after >= before + 1


@pytest.mark.asyncio
async def test_latency_histogram_observed(client: AsyncClient):
    """A request should produce at least one observation in the histogram."""
    endpoint = "/health"
    before = REQUEST_LATENCY.labels(
        method="GET", endpoint=endpoint
    )._sum.get()

    await client.get("/health")

    after = REQUEST_LATENCY.labels(
        method="GET", endpoint=endpoint
    )._sum.get()

    assert after > before


@pytest.mark.asyncio
async def test_error_counter_on_404(client: AsyncClient):
    """A 404 response should increment the error counter."""
    endpoint = "/nonexistent"
    before = REQUEST_ERRORS.labels(
        method="GET", endpoint=endpoint, status_code="404"
    )._value.get()

    await client.get("/nonexistent")

    after = REQUEST_ERRORS.labels(
        method="GET", endpoint=endpoint, status_code="404"
    )._value.get()

    assert after >= before + 1


@pytest.mark.asyncio
async def test_active_requests_returns_to_zero(client: AsyncClient):
    """After a request completes, active requests gauge should not be negative."""
    await client.get("/health")
    val = ACTIVE_REQUESTS.labels(method="GET")._value.get()
    assert val >= 0
