import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test that /health returns a valid response."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data
    assert data["status"] in ("ok", "degraded")


@pytest.mark.asyncio
async def test_health_returns_correct_version(client: AsyncClient):
    """Test that /health includes the correct application version."""
    response = await client.get("/health")
    data = response.json()
    assert data["version"] == settings.APP_VERSION


@pytest.mark.asyncio
async def test_health_does_not_require_auth(client: AsyncClient):
    """Test that health endpoints are publicly accessible."""
    for endpoint in ["/health", "/health/detail", "/health/ready"]:
        response = await client.get(endpoint)
        assert response.status_code == 200, f"{endpoint} returned {response.status_code}"


@pytest.mark.asyncio
async def test_health_detail_endpoint(client: AsyncClient):
    """Test detailed health check returns subsystem statuses."""
    response = await client.get("/health/detail")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "checks" in data
    checks = data["checks"]
    assert "database" in checks
    assert "disk" in checks
    # Database should be healthy in test environment
    assert checks["database"]["status"] == "healthy"
    assert "latency_ms" in checks["database"]
    # Disk check should have metrics
    assert "free_gb" in checks["disk"]
    assert "total_gb" in checks["disk"]
    assert "used_percent" in checks["disk"]


@pytest.mark.asyncio
async def test_health_ready_endpoint(client: AsyncClient):
    """Test readiness probe returns ready when DB is available."""
    response = await client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_health_detail_includes_redis_check(client: AsyncClient):
    """Test that detailed health check includes Redis status."""
    response = await client.get("/health/detail")
    data = response.json()
    assert "redis" in data["checks"]
    # Redis may or may not be available in test env, just check structure
    assert "status" in data["checks"]["redis"]


@pytest.mark.asyncio
async def test_health_detail_includes_celery_check(client: AsyncClient):
    """Test that detailed health check includes Celery status."""
    response = await client.get("/health/detail")
    data = response.json()
    assert "celery" in data["checks"]
    assert "status" in data["checks"]["celery"]
