import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import DEFAULT_CONFIGS, SystemConfig


# ---------------------------------------------------------------------------
# Helper: seed a config row into the test DB
# ---------------------------------------------------------------------------
async def _seed_config(session: AsyncSession, key: str = "collection_interval_minutes"):
    defaults = DEFAULT_CONFIGS[key]
    config = SystemConfig(
        key=key,
        value=defaults["value"],
        category=defaults["category"],
        description=defaults["description"],
    )
    session.add(config)
    await session.flush()
    await session.refresh(config)
    return config


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_configs_unauthorized(client: AsyncClient):
    """Listing configs requires authentication."""
    response = await client.get("/api/v1/config")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_configs(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Authenticated user can list system configurations."""
    await _seed_config(db_session, "collection_interval_minutes")
    response = await client.get("/api/v1/config", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_config_by_key(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """Retrieve a single config entry by key."""
    await _seed_config(db_session, "retention_days")
    response = await client.get("/api/v1/config/retention_days", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "retention_days"
    assert data["value"] == 1095


@pytest.mark.asyncio
async def test_get_config_not_found(client: AsyncClient, auth_headers: dict):
    """Non-existent key returns 404."""
    response = await client.get("/api/v1/config/nonexistent_key", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_config_admin(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    """Admin can update a config value."""
    await _seed_config(db_session, "sam_check_hour")
    response = await client.put(
        "/api/v1/config/sam_check_hour",
        json={"value": 6},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["value"] == 6


@pytest.mark.asyncio
async def test_update_config_forbidden_for_readonly(
    client: AsyncClient, readonly_headers: dict, db_session: AsyncSession
):
    """Non-admin users cannot update config."""
    await _seed_config(db_session, "alert_thresholds")
    response = await client.put(
        "/api/v1/config/alert_thresholds",
        json={"value": {"cpu_percent": 80, "disk_free_gb": 20}},
        headers=readonly_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_reset_config(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    """Admin can reset a config to its default value."""
    config = await _seed_config(db_session, "collection_interval_minutes")
    # First change the value
    config.value = 15
    await db_session.flush()

    response = await client.post(
        "/api/v1/config/reset/collection_interval_minutes",
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["value"] == 5  # default


@pytest.mark.asyncio
async def test_reset_config_unknown_key(client: AsyncClient, admin_headers: dict):
    """Resetting a key with no known default returns 404."""
    response = await client.post(
        "/api/v1/config/reset/unknown_key",
        headers=admin_headers,
    )
    assert response.status_code == 404
