"""
Redis cache service for AEGIS-SIGHT API.

Provides a thin async Redis wrapper with TTL-based caching, pattern
invalidation, and a ``@cached`` decorator for transparent endpoint caching.

Usage::

    from app.services.cache_service import CacheService, cached

    cache = CacheService()
    await cache.set("key", {"data": 1}, ttl=60)
    value = await cache.get("key")

    @cached(ttl=300, key_prefix="licenses")
    async def list_licenses(...):
        ...

Default TTL presets (seconds):
  - dashboard stats: 60
  - license list:    300
  - device list:     120
"""

from __future__ import annotations

import functools
import hashlib
import json
import logging
from collections.abc import Callable
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TTL presets
# ---------------------------------------------------------------------------
TTL_DASHBOARD_STATS: int = 60
TTL_LICENSE_LIST: int = 300
TTL_DEVICE_LIST: int = 120

# ---------------------------------------------------------------------------
# Cache Service
# ---------------------------------------------------------------------------


class CacheService:
    """Async Redis cache with get / set / delete / pattern-invalidate."""

    _pool: aioredis.Redis | None = None

    @classmethod
    async def get_redis(cls) -> aioredis.Redis:
        """Return (and lazily create) a shared Redis connection pool."""
        if cls._pool is None:
            cls._pool = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=20,
            )
        return cls._pool

    @classmethod
    async def close(cls) -> None:
        """Gracefully close the connection pool."""
        if cls._pool is not None:
            await cls._pool.aclose()
            cls._pool = None

    # -- core operations ---------------------------------------------------

    async def get(self, key: str) -> Any | None:
        """Retrieve a cached value by *key*. Returns ``None`` on miss."""
        try:
            r = await self.get_redis()
            raw = await r.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            logger.warning("cache get failed for key=%s", key, exc_info=True)
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Store *value* (JSON-serialisable) under *key* with *ttl* seconds."""
        try:
            r = await self.get_redis()
            raw = json.dumps(value, default=str)
            await r.set(key, raw, ex=ttl)
            return True
        except Exception:
            logger.warning("cache set failed for key=%s", key, exc_info=True)
            return False

    async def delete(self, key: str) -> bool:
        """Delete a single cache entry."""
        try:
            r = await self.get_redis()
            await r.delete(key)
            return True
        except Exception:
            logger.warning("cache delete failed for key=%s", key, exc_info=True)
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching *pattern* (e.g. ``"licenses:*"``).

        Uses SCAN to avoid blocking Redis on large key-spaces.
        Returns the number of deleted keys.
        """
        deleted = 0
        try:
            r = await self.get_redis()
            async for key in r.scan_iter(match=pattern, count=100):
                await r.delete(key)
                deleted += 1
        except Exception:
            logger.warning(
                "cache invalidate_pattern failed for pattern=%s",
                pattern,
                exc_info=True,
            )
        return deleted


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------
_cache = CacheService()


def _build_cache_key(prefix: str, args: tuple, kwargs: dict) -> str:
    """Deterministic cache key from function arguments."""
    raw = json.dumps({"a": args, "k": kwargs}, sort_keys=True, default=str)
    digest = hashlib.md5(raw.encode()).hexdigest()
    return f"{prefix}:{digest}"


def cached(ttl: int = 300, key_prefix: str = "") -> Callable:
    """
    Caching decorator for async functions.

    Example::

        @cached(ttl=TTL_LICENSE_LIST, key_prefix="licenses")
        async def list_licenses(offset: int, limit: int):
            ...

    The decorator gracefully degrades -- if Redis is unavailable the
    wrapped function executes normally without caching.
    """

    def decorator(func: Callable) -> Callable:
        prefix = key_prefix or f"{func.__module__}.{func.__qualname__}"

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache_key = _build_cache_key(prefix, args, kwargs)

            # Try cache first
            try:
                hit = await _cache.get(cache_key)
                if hit is not None:
                    return hit
            except Exception:
                logger.warning("cache get failed for key=%s", cache_key, exc_info=True)

            # Execute and cache
            result = await func(*args, **kwargs)
            try:
                await _cache.set(cache_key, result, ttl=ttl)
            except Exception:
                logger.warning("cache set failed for key=%s", cache_key, exc_info=True)
            return result

        # Expose helper to invalidate this function's cache
        wrapper.invalidate = lambda: _cache.invalidate_pattern(f"{prefix}:*")  # type: ignore[attr-defined]
        return wrapper

    return decorator
