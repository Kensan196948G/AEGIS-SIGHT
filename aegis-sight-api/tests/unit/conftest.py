"""Override session-scoped DB fixtures for unit tests that need no database."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """No-op override: unit tests in this directory do not require a database."""
    yield


# ---------------------------------------------------------------------------
# Shared async DB mock helpers (available to all unit tests via injection)
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_async_session() -> AsyncMock:
    """Return a bare AsyncMock usable as an AsyncSession.

    Configure execute/scalars/all on the returned mock in each test.
    """
    return AsyncMock()


@pytest.fixture()
def make_scalars_db():
    """Factory: given a list of rows, return an AsyncMock session whose
    ``execute().scalars().all()`` returns those rows.

    Usage::
        def test_something(make_scalars_db):
            db = make_scalars_db([row1, row2])
            svc = MyService(db=db)
    """
    def _factory(rows: list) -> AsyncMock:
        result = MagicMock()
        result.scalars.return_value.all.return_value = rows
        session = AsyncMock()
        session.execute.return_value = result
        return session
    return _factory


@pytest.fixture()
def make_all_db():
    """Factory: given a list of rows, return an AsyncMock session whose
    ``execute().all()`` returns those rows (for JOIN queries).

    Usage::
        def test_something(make_all_db):
            db = make_all_db([(sec, dev), ...])
    """
    def _factory(rows: list) -> AsyncMock:
        result = MagicMock()
        result.all.return_value = rows
        session = AsyncMock()
        session.execute.return_value = result
        return session
    return _factory


@pytest.fixture()
def make_celery_session_factory():
    """Factory: given an AsyncMock session, return a mock async session factory
    compatible with ``async with factory() as session``.

    Usage (in Celery task helper tests)::
        def test_something(make_celery_session_factory):
            session = AsyncMock()
            factory = make_celery_session_factory(session)
            with patch.object(module, "_get_async_session_factory", return_value=factory):
                result = asyncio.run(module._some_helper())
    """
    def _factory(mock_session: AsyncMock) -> MagicMock:
        mock_cm = AsyncMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
        mock_cm.__aexit__ = AsyncMock(return_value=False)
        return MagicMock(return_value=mock_cm)
    return _factory
