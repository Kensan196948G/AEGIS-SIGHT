import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test that /health returns a valid response with all required fields."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data
    assert data["status"] in ("ok", "degraded")
    assert data["database"] in ("healthy", "unhealthy")


@pytest.mark.asyncio
async def test_health_returns_correct_version(client: AsyncClient):
    """Test that /health includes the correct application version."""
    response = await client.get("/health")
    data = response.json()
    assert data["version"] == settings.APP_VERSION


@pytest.mark.asyncio
async def test_health_does_not_require_auth(client: AsyncClient):
    """Test that /health is publicly accessible without authentication."""
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_docs_accessible(client: AsyncClient):
    """Test that the OpenAPI docs endpoint is accessible."""
    response = await client.get("/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_redoc_accessible(client: AsyncClient):
    """Test that the ReDoc endpoint is accessible."""
    response = await client.get("/redoc")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    """Test that the OpenAPI JSON schema is valid."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == settings.APP_NAME
    assert schema["info"]["version"] == settings.APP_VERSION
    assert "paths" in schema


@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    """Test that the Prometheus metrics endpoint is accessible."""
    response = await client.get("/api/v1/metrics")
    assert response.status_code == 200
    assert "aegis_" in response.text or "process_" in response.text
