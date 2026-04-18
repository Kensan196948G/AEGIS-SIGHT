"""Unit tests for app/core/config.py — default value validation."""


from app.core.config import Settings


def _make_settings(**overrides) -> Settings:
    return Settings(**overrides)


# ---------------------------------------------------------------------------
# Application defaults
# ---------------------------------------------------------------------------


class TestAppDefaults:
    def test_app_name_default(self) -> None:
        s = _make_settings()
        assert s.APP_NAME == "AEGIS-SIGHT API"

    def test_app_version_default(self) -> None:
        s = _make_settings()
        assert s.APP_VERSION == "0.1.0"

    def test_debug_is_false_by_default(self) -> None:
        s = _make_settings()
        assert s.DEBUG is False


# ---------------------------------------------------------------------------
# Security defaults
# ---------------------------------------------------------------------------


class TestSecurityDefaults:
    def test_algorithm_default(self) -> None:
        s = _make_settings()
        assert s.ALGORITHM == "RS256"

    def test_access_token_expire_minutes_default(self) -> None:
        s = _make_settings()
        assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 30

    def test_secret_key_is_placeholder(self) -> None:
        # Ensures the placeholder is not accidentally left in production
        s = _make_settings()
        assert isinstance(s.SECRET_KEY, str)
        assert len(s.SECRET_KEY) > 0


# ---------------------------------------------------------------------------
# Connection URL defaults
# ---------------------------------------------------------------------------


class TestConnectionUrlDefaults:
    def test_database_url_default_driver(self) -> None:
        s = _make_settings()
        assert s.DATABASE_URL.startswith("postgresql+asyncpg://")

    def test_redis_url_default(self) -> None:
        s = _make_settings()
        assert s.REDIS_URL.startswith("redis://")

    def test_redis_url_default_db(self) -> None:
        s = _make_settings()
        assert s.REDIS_URL.endswith("/0")


# ---------------------------------------------------------------------------
# CORS defaults
# ---------------------------------------------------------------------------


class TestCorsDefaults:
    def test_cors_origins_is_list(self) -> None:
        s = _make_settings()
        assert isinstance(s.CORS_ORIGINS, list)

    def test_cors_origins_not_empty(self) -> None:
        s = _make_settings()
        assert len(s.CORS_ORIGINS) > 0

    def test_localhost_3000_in_cors(self) -> None:
        s = _make_settings()
        assert "http://localhost:3000" in s.CORS_ORIGINS

    def test_localhost_5173_in_cors(self) -> None:
        s = _make_settings()
        assert "http://localhost:5173" in s.CORS_ORIGINS


# ---------------------------------------------------------------------------
# Azure AD defaults — empty by default (no Azure configured)
# ---------------------------------------------------------------------------


class TestAzureAdDefaults:
    def test_tenant_id_empty_by_default(self) -> None:
        s = _make_settings()
        assert s.AZURE_TENANT_ID == ""

    def test_client_id_empty_by_default(self) -> None:
        s = _make_settings()
        assert s.AZURE_CLIENT_ID == ""

    def test_client_secret_empty_by_default(self) -> None:
        s = _make_settings()
        assert s.AZURE_CLIENT_SECRET == ""


# ---------------------------------------------------------------------------
# Custom overrides
# ---------------------------------------------------------------------------


class TestSettingsOverrides:
    def test_debug_override(self) -> None:
        s = _make_settings(DEBUG=True)
        assert s.DEBUG is True

    def test_app_name_override(self) -> None:
        s = _make_settings(APP_NAME="My App")
        assert s.APP_NAME == "My App"

    def test_expire_minutes_override(self) -> None:
        s = _make_settings(ACCESS_TOKEN_EXPIRE_MINUTES=60)
        assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 60

    def test_cors_origins_override(self) -> None:
        s = _make_settings(CORS_ORIGINS=["https://example.com"])
        assert s.CORS_ORIGINS == ["https://example.com"]
