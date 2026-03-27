"""API metrics collection middleware using prometheus_client."""

import time

from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# -- Prometheus metrics -------------------------------------------------------

REQUEST_COUNT = Counter(
    "aegis_http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "aegis_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

REQUEST_ERRORS = Counter(
    "aegis_http_request_errors_total",
    "Total number of HTTP request errors (status >= 400)",
    ["method", "endpoint", "status_code"],
)

ACTIVE_REQUESTS = Gauge(
    "aegis_http_active_requests",
    "Number of currently active HTTP requests",
    ["method"],
)


def _normalize_endpoint(path: str) -> str:
    """Normalize path to avoid high-cardinality labels.

    Replaces UUID-like segments and numeric IDs with placeholders.
    """
    parts = path.strip("/").split("/")
    normalized: list[str] = []
    for part in parts:
        # Replace UUID segments (32 hex chars with optional dashes)
        if len(part) >= 32 and all(c in "0123456789abcdef-" for c in part.lower()):
            normalized.append("{id}")
        # Replace purely numeric segments
        elif part.isdigit():
            normalized.append("{id}")
        else:
            normalized.append(part)
    return "/" + "/".join(normalized) if normalized else "/"


class APIMetricsMiddleware(BaseHTTPMiddleware):
    """Collect per-endpoint request count, latency, error rate, and active requests."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        method = request.method
        endpoint = _normalize_endpoint(request.url.path)

        ACTIVE_REQUESTS.labels(method=method).inc()
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            ACTIVE_REQUESTS.labels(method=method).dec()
            REQUEST_ERRORS.labels(
                method=method, endpoint=endpoint, status_code="500"
            ).inc()
            REQUEST_COUNT.labels(
                method=method, endpoint=endpoint, status_code="500"
            ).inc()
            raise

        duration = time.perf_counter() - start
        status_code = str(response.status_code)

        ACTIVE_REQUESTS.labels(method=method).dec()
        REQUEST_COUNT.labels(
            method=method, endpoint=endpoint, status_code=status_code
        ).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

        if response.status_code >= 400:
            REQUEST_ERRORS.labels(
                method=method, endpoint=endpoint, status_code=status_code
            ).inc()

        return response
