from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import NotFoundError
from app.models.system_config import DEFAULT_CONFIGS, SystemConfig
from app.models.user import User, UserRole
from app.schemas.system_config import (
    SystemConfigListResponse,
    SystemConfigResponse,
    SystemConfigUpdate,
)

router = APIRouter(prefix="/config", tags=["config"])


@router.get(
    "",
    response_model=SystemConfigListResponse,
    summary="List all system configurations",
)
async def list_configs(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Return every system configuration entry."""
    count_result = await db.execute(select(func.count(SystemConfig.id)))
    total = count_result.scalar_one()

    result = await db.execute(
        select(SystemConfig).order_by(SystemConfig.category, SystemConfig.key)
    )
    items = result.scalars().all()

    return {"items": items, "total": total}


@router.get(
    "/{key}",
    response_model=SystemConfigResponse,
    summary="Get a single configuration by key",
    responses={404: {"description": "Configuration key not found"}},
)
async def get_config(
    key: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_active_user),
):
    """Retrieve a configuration entry by its unique key."""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise NotFoundError("SystemConfig", key)
    return config


@router.put(
    "/{key}",
    response_model=SystemConfigResponse,
    summary="Update a configuration value (admin only)",
    responses={404: {"description": "Configuration key not found"}},
)
async def update_config(
    key: str,
    data: SystemConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Update the value of an existing configuration entry. Admin only."""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise NotFoundError("SystemConfig", key)

    config.value = data.value
    config.updated_by = current_user.id
    config.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(config)
    return config


@router.post(
    "/reset/{key}",
    response_model=SystemConfigResponse,
    summary="Reset a configuration to its default value (admin only)",
    responses={404: {"description": "Configuration key not found or no default available"}},
)
async def reset_config(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Reset a configuration entry back to its default value. Admin only."""
    if key not in DEFAULT_CONFIGS:
        raise NotFoundError("Default config", key)

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise NotFoundError("SystemConfig", key)

    defaults = DEFAULT_CONFIGS[key]
    config.value = defaults["value"]
    config.updated_by = current_user.id
    config.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(config)
    return config
