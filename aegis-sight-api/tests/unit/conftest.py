"""Override session-scoped DB fixtures for unit tests that need no database."""
import pytest


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """No-op override: unit tests in this directory do not require a database."""
    yield
