"""IP restriction middleware for AEGIS-SIGHT API.

Restricts access to admin endpoints (``/api/v1/admin/*``) based on client IP.
Supports CIDR notation for defining allowed ranges.
"""

from __future__ import annotations

import ipaddress
import logging
from dataclasses import dataclass, field

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


@dataclass
class IPRestrictionConfig:
    """Configuration for IP-based access restriction.

    Attributes:
        allowed_ip_ranges: List of allowed IP ranges in CIDR notation.
            An empty list means **all IPs are allowed** (default).
        restricted_path_prefixes: URL path prefixes subject to IP filtering.
    """

    allowed_ip_ranges: list[str] = field(default_factory=list)
    restricted_path_prefixes: list[str] = field(
        default_factory=lambda: ["/api/v1/admin/"]
    )


class IPRestrictionMiddleware(BaseHTTPMiddleware):
    """Block requests to restricted paths unless the client IP is allowed."""

    def __init__(self, app, config: IPRestrictionConfig | None = None) -> None:  # noqa: ANN001
        super().__init__(app)
        self.config = config or IPRestrictionConfig()
        # Pre-parse networks once at startup.
        self._networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
            ipaddress.ip_network(cidr, strict=False)
            for cidr in self.config.allowed_ip_ranges
        ]

    def _is_restricted_path(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.config.restricted_path_prefixes)

    def _is_allowed(self, client_ip: str) -> bool:
        # No ranges configured => allow all.
        if not self._networks:
            return True
        try:
            addr = ipaddress.ip_address(client_ip)
        except ValueError:
            logger.warning("Could not parse client IP: %s", client_ip)
            return False
        return any(addr in network for network in self._networks)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path
        if self._is_restricted_path(path):
            client_ip = request.client.host if request.client else "unknown"
            if not self._is_allowed(client_ip):
                logger.warning(
                    "IP restriction: blocked %s from %s", client_ip, path
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access denied: IP not allowed"},
                )
        return await call_next(request)
