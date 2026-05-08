from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "AEGIS-SIGHT API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aegis:aegis@localhost:5432/aegis_sight"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Azure AD / Microsoft Graph
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""

    # CORS
    # 開発時に systemd で常駐する Next.js dev server が port 3080 を使い、
    # かつ LAN 経由 (192.168.0.185) でモバイル / 別端末から確認するため、
    # localhost と LAN IP の両方の origin を許容する。
    # production は CORS_ORIGINS env var で本番ドメインに上書きすること。
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3080",
        "http://localhost:5173",
        "http://192.168.0.185:3000",
        "http://192.168.0.185:3080",
    ]


settings = Settings()
