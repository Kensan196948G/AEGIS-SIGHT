import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test that /health returns a valid response."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data


@pytest.mark.asyncio
async def test_health_returns_version(client: AsyncClient):
    """Test that /health includes the application version."""
    response = await client.get("/health")
    data = response.json()
    assert data["version"] is not None
