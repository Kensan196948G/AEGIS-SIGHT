"""Tests for SecurityHeadersMiddleware."""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from app.core.security_headers import SecurityHeadersConfig, SecurityHeadersMiddleware

# ---------------------------------------------------------------------------
# Helper: minimal ASGI app with the middleware attached
# ---------------------------------------------------------------------------

def _make_app(config: SecurityHeadersConfig | None = None) -> Starlette:
    async def homepage(request):
        return PlainTextResponse("OK")

    async def grafana(request):
        return PlainTextResponse("Grafana")

    app = Starlette(
        routes=[
            Route("/", homepage),
            Route("/grafana/dashboard", grafana),
        ]
    )
    app.add_middleware(SecurityHeadersMiddleware, config=config)
    return app


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_default_security_headers():
    """All default security headers are present."""
    app = _make_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/")

    assert resp.status_code == 200
    assert resp.headers["Content-Security-Policy"].startswith("default-src 'self'")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["X-XSS-Protection"] == "1; mode=block"
    assert "max-age=31536000" in resp.headers["Strict-Transport-Security"]
    assert resp.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in resp.headers["Permissions-Policy"]


@pytest.mark.asyncio
async def test_csp_contains_required_directives():
    """CSP header contains script-src, style-src, img-src directives."""
    app = _make_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/")

    csp = resp.headers["Content-Security-Policy"]
    assert "script-src 'self'" in csp
    assert "style-src 'self' 'unsafe-inline'" in csp
    assert "img-src 'self' data:" in csp


@pytest.mark.asyncio
async def test_grafana_iframe_sameorigin():
    """Grafana paths get X-Frame-Options: SAMEORIGIN instead of DENY."""
    config = SecurityHeadersConfig(grafana_iframe_paths=["/grafana/"])
    app = _make_app(config=config)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp_normal = await ac.get("/")
        resp_grafana = await ac.get("/grafana/dashboard")

    assert resp_normal.headers["X-Frame-Options"] == "DENY"
    assert resp_grafana.headers["X-Frame-Options"] == "SAMEORIGIN"


@pytest.mark.asyncio
async def test_custom_headers():
    """Extra custom headers from config are applied."""
    config = SecurityHeadersConfig(
        extra_headers={"X-Custom-Header": "aegis-sight"}
    )
    app = _make_app(config=config)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/")

    assert resp.headers["X-Custom-Header"] == "aegis-sight"


@pytest.mark.asyncio
async def test_custom_x_frame_options():
    """X-Frame-Options can be overridden globally."""
    config = SecurityHeadersConfig(x_frame_options="SAMEORIGIN")
    app = _make_app(config=config)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/")

    assert resp.headers["X-Frame-Options"] == "SAMEORIGIN"


@pytest.mark.asyncio
async def test_hsts_includes_subdomains():
    """HSTS header includes includeSubDomains."""
    app = _make_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/")

    assert "includeSubDomains" in resp.headers["Strict-Transport-Security"]
