import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.health import router as health_router
from app.api.v1.router import TAG_METADATA, api_router
from app.core.api_metrics import APIMetricsMiddleware
from app.core.compression import setup_compression
from app.core.config import settings
from app.core.database import engine
from app.core.etag import ETagMiddleware
from app.core.exceptions import AEGISBaseException
from app.core.ip_restriction import IPRestrictionMiddleware
from app.core.middleware import RequestLoggingMiddleware, RequestTimingMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

logger = logging.getLogger(__name__)


DEFAULT_INSECURE_SECRET_KEY = "CHANGE-ME-IN-PRODUCTION"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup security gate: refuse to boot in production with the default placeholder
    # SECRET_KEY. JWT signing must not fall back to a hard-coded value when DEBUG=False.
    if not settings.DEBUG and settings.SECRET_KEY == DEFAULT_INSECURE_SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY must not use the placeholder value 'CHANGE-ME-IN-PRODUCTION' "
            "when DEBUG is False. Set the SECRET_KEY environment variable (or .env entry) "
            "to a strong random secret before starting the API in production."
        )

    # Startup: verify DB connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.error("Database connection failed: %s", e)
        raise

    yield

    # Shutdown: dispose engine
    await engine.dispose()
    logger.info("Database engine disposed.")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AEGIS-SIGHT is a comprehensive IT asset management and software "
        "license compliance platform. It provides device inventory tracking, "
        "SAM (Software Asset Management) compliance checks, and end-to-end "
        "procurement lifecycle management."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "health",
            "description": "System health and readiness checks",
        },
        *TAG_METADATA,
    ],
)


# ---- Global exception handlers ----


@app.exception_handler(AEGISBaseException)
async def aegis_exception_handler(request: Request, exc: AEGISBaseException):
    """Handle all custom AEGIS exceptions with a consistent JSON structure."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions -- return 500 without leaking internals."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression (wraps all responses >= 1000 bytes)
setup_compression(app, minimum_size=1000)

# Custom middleware (order matters: outermost middleware runs first)
app.add_middleware(ETagMiddleware, max_age=60, exclude_paths=["/auth/", "/ws/", "/health"])
app.add_middleware(APIMetricsMiddleware)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(IPRestrictionMiddleware)

# Register API router
app.include_router(api_router)

# Register health check routes (at root, not under /api/v1)
app.include_router(health_router)
