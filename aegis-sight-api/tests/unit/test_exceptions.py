"""Unit tests for app/core/exceptions.py — custom HTTPException subclasses."""

from fastapi import HTTPException, status

from app.core.exceptions import (
    AEGISBaseException,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    InvalidStateTransitionError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
)

# ---------------------------------------------------------------------------
# AEGISBaseException
# ---------------------------------------------------------------------------


class TestAEGISBaseException:
    def test_is_http_exception(self) -> None:
        exc = AEGISBaseException(status_code=400, detail="test")
        assert isinstance(exc, HTTPException)

    def test_status_code_preserved(self) -> None:
        exc = AEGISBaseException(status_code=422, detail="validation error")
        assert exc.status_code == 422

    def test_detail_preserved(self) -> None:
        exc = AEGISBaseException(status_code=400, detail="bad input")
        assert exc.detail == "bad input"

    def test_headers_none_by_default(self) -> None:
        exc = AEGISBaseException(status_code=400, detail="test")
        assert exc.headers is None

    def test_custom_headers_preserved(self) -> None:
        headers = {"X-Custom": "value"}
        exc = AEGISBaseException(status_code=400, detail="test", headers=headers)
        assert exc.headers == headers


# ---------------------------------------------------------------------------
# NotFoundError
# ---------------------------------------------------------------------------


class TestNotFoundError:
    def test_status_code_is_404(self) -> None:
        exc = NotFoundError()
        assert exc.status_code == status.HTTP_404_NOT_FOUND

    def test_default_detail(self) -> None:
        exc = NotFoundError()
        assert "Resource" in exc.detail
        assert "not found" in exc.detail

    def test_custom_resource_name(self) -> None:
        exc = NotFoundError(resource="Device")
        assert "Device" in exc.detail
        assert "not found" in exc.detail

    def test_with_resource_id(self) -> None:
        exc = NotFoundError(resource="Device", resource_id="abc-123")
        assert "abc-123" in exc.detail
        assert "Device" in exc.detail

    def test_without_resource_id_no_id_in_message(self) -> None:
        exc = NotFoundError(resource="Device")
        assert "id" not in exc.detail.lower() or "not found" in exc.detail

    def test_is_aegis_base_exception(self) -> None:
        exc = NotFoundError()
        assert isinstance(exc, AEGISBaseException)


# ---------------------------------------------------------------------------
# ForbiddenError
# ---------------------------------------------------------------------------


class TestForbiddenError:
    def test_status_code_is_403(self) -> None:
        exc = ForbiddenError()
        assert exc.status_code == status.HTTP_403_FORBIDDEN

    def test_default_detail(self) -> None:
        exc = ForbiddenError()
        assert "permission" in exc.detail.lower()

    def test_custom_detail(self) -> None:
        exc = ForbiddenError(detail="Read-only access")
        assert exc.detail == "Read-only access"

    def test_is_aegis_base_exception(self) -> None:
        assert isinstance(ForbiddenError(), AEGISBaseException)


# ---------------------------------------------------------------------------
# ConflictError
# ---------------------------------------------------------------------------


class TestConflictError:
    def test_status_code_is_409(self) -> None:
        exc = ConflictError()
        assert exc.status_code == status.HTTP_409_CONFLICT

    def test_default_detail(self) -> None:
        exc = ConflictError()
        assert "already exists" in exc.detail

    def test_custom_detail(self) -> None:
        exc = ConflictError(detail="Duplicate device ID")
        assert exc.detail == "Duplicate device ID"

    def test_is_aegis_base_exception(self) -> None:
        assert isinstance(ConflictError(), AEGISBaseException)


# ---------------------------------------------------------------------------
# UnauthorizedError
# ---------------------------------------------------------------------------


class TestUnauthorizedError:
    def test_status_code_is_401(self) -> None:
        exc = UnauthorizedError()
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED

    def test_default_detail(self) -> None:
        exc = UnauthorizedError()
        assert "credentials" in exc.detail.lower()

    def test_www_authenticate_header(self) -> None:
        exc = UnauthorizedError()
        assert exc.headers is not None
        assert "WWW-Authenticate" in exc.headers
        assert exc.headers["WWW-Authenticate"] == "Bearer"

    def test_custom_detail(self) -> None:
        exc = UnauthorizedError(detail="Token expired")
        assert exc.detail == "Token expired"

    def test_is_aegis_base_exception(self) -> None:
        assert isinstance(UnauthorizedError(), AEGISBaseException)


# ---------------------------------------------------------------------------
# BadRequestError
# ---------------------------------------------------------------------------


class TestBadRequestError:
    def test_status_code_is_400(self) -> None:
        exc = BadRequestError()
        assert exc.status_code == status.HTTP_400_BAD_REQUEST

    def test_default_detail(self) -> None:
        exc = BadRequestError()
        assert exc.detail == "Bad request"

    def test_custom_detail(self) -> None:
        exc = BadRequestError(detail="Invalid IP address format")
        assert exc.detail == "Invalid IP address format"

    def test_is_aegis_base_exception(self) -> None:
        assert isinstance(BadRequestError(), AEGISBaseException)


# ---------------------------------------------------------------------------
# InvalidStateTransitionError
# ---------------------------------------------------------------------------


class TestInvalidStateTransitionError:
    def test_status_code_is_400(self) -> None:
        exc = InvalidStateTransitionError(current_status="active", action="delete")
        assert exc.status_code == status.HTTP_400_BAD_REQUEST

    def test_detail_contains_current_status(self) -> None:
        exc = InvalidStateTransitionError(current_status="archived", action="edit")
        assert "archived" in exc.detail

    def test_detail_contains_action(self) -> None:
        exc = InvalidStateTransitionError(current_status="active", action="archive")
        assert "archive" in exc.detail

    def test_is_bad_request_error(self) -> None:
        exc = InvalidStateTransitionError(current_status="x", action="y")
        assert isinstance(exc, BadRequestError)

    def test_is_aegis_base_exception(self) -> None:
        exc = InvalidStateTransitionError(current_status="x", action="y")
        assert isinstance(exc, AEGISBaseException)

    def test_is_http_exception(self) -> None:
        exc = InvalidStateTransitionError(current_status="x", action="y")
        assert isinstance(exc, HTTPException)


# ---------------------------------------------------------------------------
# ServiceUnavailableError
# ---------------------------------------------------------------------------


class TestServiceUnavailableError:
    def test_status_code_is_503(self) -> None:
        exc = ServiceUnavailableError()
        assert exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_default_detail_contains_service_name(self) -> None:
        exc = ServiceUnavailableError()
        assert "External service" in exc.detail

    def test_custom_service_name(self) -> None:
        exc = ServiceUnavailableError(service="Redis")
        assert "Redis" in exc.detail

    def test_detail_mentions_unavailable(self) -> None:
        exc = ServiceUnavailableError(service="SMTP")
        assert "unavailable" in exc.detail.lower()

    def test_is_aegis_base_exception(self) -> None:
        assert isinstance(ServiceUnavailableError(), AEGISBaseException)
