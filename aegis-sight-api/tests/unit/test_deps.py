"""Unit tests for app/core/deps.py dependency factories."""

from __future__ import annotations

import asyncio
import inspect
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import ForbiddenError
from app.models.user import UserRole


def _make_user(role: UserRole = UserRole.admin, is_active: bool = True) -> MagicMock:
    """Return a mock User with the given role and is_active flag."""
    user = MagicMock()
    user.role = role
    user.is_active = is_active
    return user


class TestGetCurrentActiveUser:
    def test_is_coroutine_function(self) -> None:
        assert inspect.iscoroutinefunction(get_current_active_user)

    def test_active_user_is_returned(self) -> None:
        user = _make_user(is_active=True)
        result = asyncio.run(get_current_active_user(current_user=user))
        assert result is user

    def test_inactive_user_raises_forbidden(self) -> None:
        user = _make_user(is_active=False)
        with pytest.raises(ForbiddenError):
            asyncio.run(get_current_active_user(current_user=user))

    def test_inactive_user_error_message(self) -> None:
        user = _make_user(is_active=False)
        with pytest.raises(ForbiddenError) as exc_info:
            asyncio.run(get_current_active_user(current_user=user))
        assert "Inactive" in str(exc_info.value.detail)

    def test_active_admin_user_passes(self) -> None:
        user = _make_user(role=UserRole.admin, is_active=True)
        result = asyncio.run(get_current_active_user(current_user=user))
        assert result.role == UserRole.admin

    def test_active_readonly_user_passes(self) -> None:
        user = _make_user(role=UserRole.readonly, is_active=True)
        result = asyncio.run(get_current_active_user(current_user=user))
        assert result.is_active is True


class TestRequireRole:
    def test_returns_callable(self) -> None:
        dep = require_role(UserRole.admin)
        assert callable(dep)

    def test_inner_function_is_coroutine(self) -> None:
        dep = require_role(UserRole.admin)
        assert inspect.iscoroutinefunction(dep)

    def test_allowed_role_passes(self) -> None:
        dep = require_role(UserRole.admin)
        user = _make_user(role=UserRole.admin)
        result = asyncio.run(dep(current_user=user))
        assert result is user

    def test_disallowed_role_raises_forbidden(self) -> None:
        dep = require_role(UserRole.admin)
        user = _make_user(role=UserRole.readonly)
        with pytest.raises(ForbiddenError):
            asyncio.run(dep(current_user=user))

    def test_multiple_allowed_roles_first_passes(self) -> None:
        dep = require_role(UserRole.admin, UserRole.operator)
        user = _make_user(role=UserRole.admin)
        result = asyncio.run(dep(current_user=user))
        assert result is user

    def test_multiple_allowed_roles_second_passes(self) -> None:
        dep = require_role(UserRole.admin, UserRole.operator)
        user = _make_user(role=UserRole.operator)
        result = asyncio.run(dep(current_user=user))
        assert result is user

    def test_multiple_allowed_roles_excluded_raises(self) -> None:
        dep = require_role(UserRole.admin, UserRole.operator)
        user = _make_user(role=UserRole.readonly)
        with pytest.raises(ForbiddenError):
            asyncio.run(dep(current_user=user))

    def test_error_message_contains_role_names(self) -> None:
        dep = require_role(UserRole.admin)
        user = _make_user(role=UserRole.readonly)
        with pytest.raises(ForbiddenError) as exc_info:
            asyncio.run(dep(current_user=user))
        assert "admin" in str(exc_info.value.detail)

    def test_all_roles_allowed_passes_any(self) -> None:
        dep = require_role(UserRole.admin, UserRole.operator, UserRole.auditor, UserRole.readonly)
        for role in UserRole:
            user = _make_user(role=role)
            result = asyncio.run(dep(current_user=user))
            assert result is user

    def test_auditor_role_allowed(self) -> None:
        dep = require_role(UserRole.auditor)
        user = _make_user(role=UserRole.auditor)
        result = asyncio.run(dep(current_user=user))
        assert result.role == UserRole.auditor

    def test_different_factories_independent(self) -> None:
        admin_dep = require_role(UserRole.admin)
        operator_dep = require_role(UserRole.operator)
        admin_user = _make_user(role=UserRole.admin)
        operator_user = _make_user(role=UserRole.operator)

        assert asyncio.run(admin_dep(current_user=admin_user)) is admin_user
        with pytest.raises(ForbiddenError):
            asyncio.run(admin_dep(current_user=operator_user))
        assert asyncio.run(operator_dep(current_user=operator_user)) is operator_user
