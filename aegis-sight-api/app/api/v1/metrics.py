from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

router = APIRouter(tags=["metrics"])

# Define application metrics
REQUEST_COUNT = Counter(
    "aegis_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "aegis_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

ACTIVE_DEVICES = Gauge(
    "aegis_active_devices_total",
    "Number of active devices",
)

COMPLIANCE_VIOLATIONS = Gauge(
    "aegis_compliance_violations_total",
    "Number of license compliance violations",
)

PENDING_PROCUREMENT = Gauge(
    "aegis_pending_procurement_total",
    "Number of pending procurement requests",
)


@router.get(
    "/metrics",
    response_class=PlainTextResponse,
    summary="Prometheus metrics",
    description="Expose application metrics in Prometheus exposition format for scraping.",
)
async def get_metrics():
    """Expose Prometheus metrics."""
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
