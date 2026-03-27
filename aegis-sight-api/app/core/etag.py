"""ETag middleware for conditional HTTP responses."""

import hashlib
from collections.abc import Sequence

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class ETagMiddleware(BaseHTTPMiddleware):
    """Generate ETag headers and return 304 Not Modified when content is unchanged.

    Args:
        app: The ASGI application.
        max_age: Cache-Control max-age in seconds (default 60).
        exclude_paths: URL path prefixes to skip ETag processing.
    """

    def __init__(
        self,
        app,
        max_age: int = 60,
        exclude_paths: Sequence[str] = ("/auth/", "/ws/", "/health"),
    ):
        super().__init__(app)
        self.max_age = max_age
        self.exclude_paths = tuple(exclude_paths)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip non-GET requests and excluded paths
        if request.method != "GET":
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(prefix) for prefix in self.exclude_paths):
            return await call_next(request)

        response = await call_next(request)

        # Only process successful responses with a body
        if response.status_code != 200:
            return response

        # Read the response body
        body = b""
        async for chunk in response.body_iterator:
            if isinstance(chunk, str):
                body += chunk.encode("utf-8")
            else:
                body += chunk

        # Generate ETag from MD5 hash of response body
        etag = f'"{hashlib.md5(body).hexdigest()}"'  # noqa: S324

        # Check If-None-Match header
        if_none_match = request.headers.get("if-none-match")
        if if_none_match and if_none_match == etag:
            return Response(
                status_code=304,
                headers={
                    "ETag": etag,
                    "Cache-Control": f"max-age={self.max_age}",
                },
            )

        # Return response with ETag and Cache-Control headers
        return Response(
            content=body,
            status_code=response.status_code,
            headers={
                **dict(response.headers),
                "ETag": etag,
                "Cache-Control": f"max-age={self.max_age}",
            },
            media_type=response.media_type,
        )
