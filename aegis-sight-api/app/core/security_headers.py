"""Security headers middleware for AEGIS-SIGHT API.

Applies security-related HTTP response headers to every response.
Headers can be customised via the ``SecurityHeadersConfig`` dataclass.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


@dataclass
class SecurityHeadersConfig:
    """Configuration for security response headers.

    All values have secure defaults.  Override individual fields to customise.
    """

    content_security_policy: str = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    )

    x_content_type_options: str = "nosniff"

    # "DENY" by default; set to "SAMEORIGIN" when Grafana iframes are used.
    x_frame_options: str = "DENY"

    x_xss_protection: str = "1; mode=block"

    strict_transport_security: str = "max-age=31536000; includeSubDomains"

    referrer_policy: str = "strict-origin-when-cross-origin"

    permissions_policy: str = "camera=(), microphone=(), geolocation=()"

    # Extra headers as key-value pairs.
    extra_headers: dict[str, str] = field(default_factory=dict)

    # Paths that use SAMEORIGIN instead of the default X-Frame-Options value
    # (e.g. Grafana embed endpoints).
    grafana_iframe_paths: list[str] = field(default_factory=list)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers into every HTTP response."""

    def __init__(self, app, config: SecurityHeadersConfig | None = None) -> None:
        super().__init__(app)
        self.config = config or SecurityHeadersConfig()

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        cfg = self.config

        response.headers["Content-Security-Policy"] = cfg.content_security_policy
        response.headers["X-Content-Type-Options"] = cfg.x_content_type_options
        response.headers["X-XSS-Protection"] = cfg.x_xss_protection
        response.headers["Strict-Transport-Security"] = cfg.strict_transport_security
        response.headers["Referrer-Policy"] = cfg.referrer_policy
        response.headers["Permissions-Policy"] = cfg.permissions_policy

        # Grafana iframe paths get SAMEORIGIN; everything else uses the default.
        path = request.url.path
        if cfg.grafana_iframe_paths and any(
            path.startswith(p) for p in cfg.grafana_iframe_paths
        ):
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        else:
            response.headers["X-Frame-Options"] = cfg.x_frame_options

        # Extra custom headers
        for header_name, header_value in cfg.extra_headers.items():
            response.headers[header_name] = header_value

        return response
