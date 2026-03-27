"""
Redis-backed sliding-window rate limiter for AEGIS-SIGHT API.

Provides a configurable :class:`RateLimiter` that can be used as a
FastAPI dependency.

Usage::

    from app.core.rate_limit import RateLimiter

    # Default: 100 req/min
    @router.get("/items", dependencies=[Depends(RateLimiter())])
    async def list_items():
        ...

    # Telemetry: 1000 req/min
    @router.post("/telemetry", dependencies=[Depends(RateLimiter(max_requests=1000, window_seconds=60))])
    async def ingest_telemetry():
        ...

    # Auth: 10 req/min (brute-force protection)
    @router.post("/login", dependencies=[Depends(RateLimiter(max_requests=10, window_seconds=60))])
    async def login():
        ...
"""

from __future__ import annotations

import time

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings

# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------
RATE_DEFAULT = 100  # requests per minute
RATE_TELEMETRY = 1000
RATE_AUTH = 10
WINDOW_DEFAULT = 60  # seconds

# ---------------------------------------------------------------------------
# Redis helper (shares pool with CacheService when possible)
# ---------------------------------------------------------------------------
_pool: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=10,
        )
    return _pool


# ---------------------------------------------------------------------------
# Sliding-window rate limiter
# ---------------------------------------------------------------------------
class RateLimiter:
    """
    FastAPI dependency that enforces a sliding-window rate limit per client IP.

    Parameters
    ----------
    max_requests : int
        Maximum number of requests allowed within *window_seconds*.
    window_seconds : int
        Length of the sliding window in seconds.
    key_prefix : str
        Redis key prefix (useful to separate limit buckets).
    """

    def __init__(
        self,
        max_requests: int = RATE_DEFAULT,
        window_seconds: int = WINDOW_DEFAULT,
        key_prefix: str = "rl",
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{self.key_prefix}:{request.url.path}:{client_ip}"
        now = time.time()
        window_start = now - self.window_seconds

        try:
            r = await _get_redis()

            pipe = r.pipeline()
            # Remove entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            # Count remaining entries
            pipe.zcard(key)
            # Add the current request
            pipe.zadd(key, {str(now): now})
            # Ensure the key expires eventually
            pipe.expire(key, self.window_seconds + 1)
            results = await pipe.execute()

            request_count: int = results[1]

            if request_count >= self.max_requests:
                retry_after = int(self.window_seconds - (now - window_start))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s.",
                    headers={"Retry-After": str(max(retry_after, 1))},
                )
        except HTTPException:
            raise
        except Exception:
            # Fail open -- if Redis is down, allow the request through
            pass


# ---------------------------------------------------------------------------
# Convenience instances for common presets
# ---------------------------------------------------------------------------
default_rate_limit = RateLimiter(max_requests=RATE_DEFAULT, window_seconds=WINDOW_DEFAULT)
telemetry_rate_limit = RateLimiter(max_requests=RATE_TELEMETRY, window_seconds=WINDOW_DEFAULT)
auth_rate_limit = RateLimiter(max_requests=RATE_AUTH, window_seconds=WINDOW_DEFAULT)
