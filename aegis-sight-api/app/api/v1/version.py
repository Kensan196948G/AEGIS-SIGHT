"""
API version information endpoint.

Exposes build metadata, runtime versions, and compatibility constraints so
that agents and frontends can verify they are talking to a compatible API.
"""

from __future__ import annotations

import subprocess
import sys
from datetime import UTC, datetime
from functools import lru_cache

from fastapi import APIRouter
from pydantic import BaseModel

from app.version import __api_version__, __version__

router = APIRouter(prefix="/version", tags=["version"])


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
class VersionResponse(BaseModel):
    """API version metadata returned by ``GET /api/v1/version``."""

    api_version: str
    app_version: str
    python_version: str
    build_date: str
    git_commit_hash: str
    minimum_agent_version: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _git_commit_hash() -> str:
    """Best-effort retrieval of the current git commit short hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


@lru_cache(maxsize=1)
def _build_date() -> str:
    """Return an ISO-8601 UTC timestamp captured at first invocation."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
API_VERSION = __api_version__
MINIMUM_AGENT_VERSION = "0.1.0"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=VersionResponse,
    summary="API version information",
    description=(
        "Returns version metadata for the AEGIS-SIGHT API including "
        "the API version, application version, Python runtime version, "
        "build date, git commit hash, and minimum supported agent version."
    ),
)
async def get_version() -> VersionResponse:
    return VersionResponse(
        api_version=API_VERSION,
        app_version=__version__,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        build_date=_build_date(),
        git_commit_hash=_git_commit_hash(),
        minimum_agent_version=MINIMUM_AGENT_VERSION,
    )
