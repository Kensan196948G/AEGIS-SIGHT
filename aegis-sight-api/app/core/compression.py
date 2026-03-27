"""Response compression configuration for AEGIS-SIGHT API."""

from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware


def setup_compression(app: FastAPI, minimum_size: int = 1000) -> None:
    """Add GZip compression middleware to the FastAPI application.

    Args:
        app: The FastAPI application instance.
        minimum_size: Minimum response size in bytes before compression is applied.
                      Defaults to 1000 bytes.
    """
    app.add_middleware(GZipMiddleware, minimum_size=minimum_size)
