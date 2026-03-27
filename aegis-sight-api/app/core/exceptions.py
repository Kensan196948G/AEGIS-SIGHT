"""Custom exception classes for AEGIS-SIGHT API."""

from fastapi import HTTPException, status


class AEGISBaseException(HTTPException):
    """Base exception for all AEGIS-SIGHT API errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(
            status_code=status_code, detail=detail, headers=headers
        )


class NotFoundError(AEGISBaseException):
    """Resource not found (404)."""

    def __init__(self, resource: str = "Resource", resource_id: str | None = None):
        detail = f"{resource} not found"
        if resource_id:
            detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenError(AEGISBaseException):
    """Access forbidden (403)."""

    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(AEGISBaseException):
    """Resource conflict (409)."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class UnauthorizedError(AEGISBaseException):
    """Authentication required (401)."""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class BadRequestError(AEGISBaseException):
    """Bad request (400)."""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class InvalidStateTransitionError(BadRequestError):
    """Invalid workflow state transition."""

    def __init__(self, current_status: str, action: str):
        detail = f"Cannot perform '{action}' on resource in '{current_status}' status"
        super().__init__(detail=detail)


class ServiceUnavailableError(AEGISBaseException):
    """External service unavailable (503)."""

    def __init__(self, service: str = "External service"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{service} is temporarily unavailable",
        )
