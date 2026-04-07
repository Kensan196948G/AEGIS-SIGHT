"""Session management with Redis backend for AEGIS-SIGHT.

Provides concurrent session control, session invalidation, and
admin-level session listing.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis key prefixes
_SESSION_PREFIX = "aegis:session:"
_USER_SESSIONS_PREFIX = "aegis:user_sessions:"


@dataclass
class SessionInfo:
    """Represents a single user session."""

    session_id: str
    user_id: str
    created_at: str
    last_activity: str
    ip_address: str
    user_agent: str

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "last_activity": self.last_activity,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
        }


class SessionManager:
    """Redis-backed session manager with concurrent session limiting."""

    def __init__(
        self,
        redis_url: str | None = None,
        max_sessions: int = 5,
        session_ttl_seconds: int = 86400,  # 24 hours
    ) -> None:
        self.redis_url = redis_url or settings.REDIS_URL
        self.max_sessions = max_sessions
        self.session_ttl = session_ttl_seconds
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                self.redis_url, decode_responses=True
            )
        return self._redis

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.close()
            self._redis = None

    # ------------------------------------------------------------------
    # Session creation
    # ------------------------------------------------------------------

    async def create_session(
        self,
        user_id: str,
        ip_address: str = "",
        user_agent: str = "",
    ) -> SessionInfo:
        """Create a new session for *user_id*.

        If the user already has ``max_sessions`` active sessions, the oldest
        session is evicted automatically.
        """
        redis = await self._get_redis()
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        session = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            created_at=now,
            last_activity=now,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Store session data
        session_key = f"{_SESSION_PREFIX}{session_id}"
        await redis.set(
            session_key,
            json.dumps(session.to_dict()),
            ex=self.session_ttl,
        )

        # Track session in user's session set
        user_key = f"{_USER_SESSIONS_PREFIX}{user_id}"
        await redis.sadd(user_key, session_id)
        await redis.expire(user_key, self.session_ttl)

        # Enforce max sessions -- evict oldest if over limit
        await self._enforce_session_limit(user_id)

        logger.info(
            "Session created: session_id=%s user_id=%s", session_id, user_id
        )
        return session

    async def _enforce_session_limit(self, user_id: str) -> None:
        """Remove oldest sessions if user exceeds max_sessions."""
        redis = await self._get_redis()
        user_key = f"{_USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await redis.smembers(user_key)

        # Collect valid sessions with their creation times
        sessions: list[tuple[str, str]] = []
        for sid in session_ids:
            data = await redis.get(f"{_SESSION_PREFIX}{sid}")
            if data is None:
                # Expired session reference -- clean up
                await redis.srem(user_key, sid)
                continue
            info = json.loads(data)
            sessions.append((sid, info.get("created_at", "")))

        if len(sessions) <= self.max_sessions:
            return

        # Sort by created_at ascending and remove the oldest
        sessions.sort(key=lambda x: x[1])
        to_remove = sessions[: len(sessions) - self.max_sessions]
        for sid, _ in to_remove:
            await self.invalidate_session(sid)
            logger.info(
                "Session evicted (limit reached): session_id=%s user_id=%s",
                sid,
                user_id,
            )

    # ------------------------------------------------------------------
    # Session retrieval
    # ------------------------------------------------------------------

    async def get_session(self, session_id: str) -> SessionInfo | None:
        """Return session info or ``None`` if not found / expired."""
        redis = await self._get_redis()
        data = await redis.get(f"{_SESSION_PREFIX}{session_id}")
        if data is None:
            return None
        info = json.loads(data)
        return SessionInfo(**info)

    async def update_activity(self, session_id: str) -> None:
        """Update the ``last_activity`` timestamp for a session."""
        redis = await self._get_redis()
        session_key = f"{_SESSION_PREFIX}{session_id}"
        data = await redis.get(session_key)
        if data is None:
            return
        info = json.loads(data)
        info["last_activity"] = datetime.now(timezone.utc).isoformat()
        await redis.set(session_key, json.dumps(info), keepttl=True)

    # ------------------------------------------------------------------
    # Session invalidation
    # ------------------------------------------------------------------

    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate (delete) a single session. Returns True if it existed."""
        redis = await self._get_redis()
        session_key = f"{_SESSION_PREFIX}{session_id}"
        data = await redis.get(session_key)
        if data is None:
            return False
        info = json.loads(data)
        user_id = info.get("user_id", "")
        await redis.delete(session_key)
        await redis.srem(f"{_USER_SESSIONS_PREFIX}{user_id}", session_id)
        logger.info("Session invalidated: session_id=%s", session_id)
        return True

    async def invalidate_all_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user. Returns number removed."""
        redis = await self._get_redis()
        user_key = f"{_USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await redis.smembers(user_key)
        count = 0
        for sid in session_ids:
            await redis.delete(f"{_SESSION_PREFIX}{sid}")
            count += 1
        await redis.delete(user_key)
        logger.info(
            "All sessions invalidated: user_id=%s count=%d", user_id, count
        )
        return count

    # ------------------------------------------------------------------
    # Admin: list sessions
    # ------------------------------------------------------------------

    async def list_user_sessions(self, user_id: str) -> list[SessionInfo]:
        """List all active sessions for a specific user."""
        redis = await self._get_redis()
        user_key = f"{_USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await redis.smembers(user_key)
        sessions: list[SessionInfo] = []
        for sid in session_ids:
            data = await redis.get(f"{_SESSION_PREFIX}{sid}")
            if data is None:
                await redis.srem(user_key, sid)
                continue
            info = json.loads(data)
            sessions.append(SessionInfo(**info))
        sessions.sort(key=lambda s: s.created_at, reverse=True)
        return sessions

    async def list_all_sessions(self) -> list[SessionInfo]:
        """List all active sessions across all users (admin).

        Uses a SCAN-based approach to avoid blocking Redis on large key sets.
        """
        redis = await self._get_redis()
        sessions: list[SessionInfo] = []
        async for key in redis.scan_iter(match=f"{_SESSION_PREFIX}*", count=100):
            data = await redis.get(key)
            if data is not None:
                info = json.loads(data)
                sessions.append(SessionInfo(**info))
        sessions.sort(key=lambda s: s.last_activity, reverse=True)
        return sessions
