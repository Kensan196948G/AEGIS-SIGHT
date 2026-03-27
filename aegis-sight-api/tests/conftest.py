"""
Shared pytest fixtures for AEGIS-SIGHT API tests.

Features:
  - Automatic test DB creation / teardown (session-scoped)
  - Per-test transactional rollback
  - Factory helpers for each role (admin / operator / auditor / readonly)
  - Async HTTP client with DB override
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User, UserRole
from tests.factories import (
    DeviceFactory,
    LicenseFactory,
    ProcurementFactory,
    UserFactory,
)

# ---------------------------------------------------------------------------
# Test database engine
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    "/aegis_sight", "/aegis_sight_test"
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_async_session = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


# ---------------------------------------------------------------------------
# Event loop (session-scoped for async fixtures)
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# Database lifecycle
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session for each test (auto-rollback)."""
    async with test_async_session() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client with DB dependency override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Role-based user fixtures (factory pattern)
# ---------------------------------------------------------------------------
async def _create_user(
    session: AsyncSession,
    role: UserRole,
    email: str | None = None,
) -> User:
    """Insert a user with the given role and return it."""
    user = UserFactory(
        role=role,
        email=email or f"{role.value}-{uuid.uuid4().hex[:6]}@aegis-sight.local",
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    return await _create_user(db_session, UserRole.admin)


@pytest_asyncio.fixture
async def operator_user(db_session: AsyncSession) -> User:
    return await _create_user(db_session, UserRole.operator)


@pytest_asyncio.fixture
async def auditor_user(db_session: AsyncSession) -> User:
    return await _create_user(db_session, UserRole.auditor)


@pytest_asyncio.fixture
async def readonly_user(db_session: AsyncSession) -> User:
    return await _create_user(db_session, UserRole.readonly)


# Legacy alias -- existing tests use ``test_user``
@pytest_asyncio.fixture
async def test_user(admin_user: User) -> User:
    return admin_user


# ---------------------------------------------------------------------------
# Auth header helpers
# ---------------------------------------------------------------------------
def _make_auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict[str, str]:
    """Auth headers for the default admin test user."""
    return _make_auth_headers(test_user)


@pytest_asyncio.fixture
async def admin_headers(admin_user: User) -> dict[str, str]:
    return _make_auth_headers(admin_user)


@pytest_asyncio.fixture
async def operator_headers(operator_user: User) -> dict[str, str]:
    return _make_auth_headers(operator_user)


@pytest_asyncio.fixture
async def auditor_headers(auditor_user: User) -> dict[str, str]:
    return _make_auth_headers(auditor_user)


@pytest_asyncio.fixture
async def readonly_headers(readonly_user: User) -> dict[str, str]:
    return _make_auth_headers(readonly_user)


# ---------------------------------------------------------------------------
# Convenience data-creation fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def sample_device(db_session: AsyncSession):
    """Create and return a single test device."""
    device = DeviceFactory()
    db_session.add(device)
    await db_session.flush()
    await db_session.refresh(device)
    return device


@pytest_asyncio.fixture
async def sample_license(db_session: AsyncSession):
    """Create and return a single test software license."""
    lic = LicenseFactory()
    db_session.add(lic)
    await db_session.flush()
    await db_session.refresh(lic)
    return lic


@pytest_asyncio.fixture
async def sample_procurement(db_session: AsyncSession, operator_user: User):
    """Create and return a single test procurement request."""
    proc = ProcurementFactory(requester_id=operator_user.id)
    db_session.add(proc)
    await db_session.flush()
    await db_session.refresh(proc)
    return proc
