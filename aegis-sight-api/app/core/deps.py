"""Common FastAPI dependencies."""

from collections.abc import Callable

from fastapi import Depends

from app.core.exceptions import ForbiddenError
from app.core.security import get_current_user
from app.models.user import User, UserRole


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that ensures the current user is active.

    This is a convenience wrapper around get_current_user that
    explicitly checks the is_active flag. get_current_user already
    performs this check, but this dependency makes the intent clearer
    at the endpoint level.
    """
    if not current_user.is_active:
        raise ForbiddenError(detail="Inactive user account")
    return current_user


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory that restricts access to users with specific roles.

    Usage::

        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_role(UserRole.admin)),
        ):
            ...

        @router.get("/operators")
        async def operator_endpoint(
            user: User = Depends(require_role(UserRole.admin, UserRole.operator)),
        ):
            ...
    """

    async def _check_role(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            role_names = ", ".join(r.value for r in allowed_roles)
            raise ForbiddenError(
                detail=f"This action requires one of the following roles: {role_names}"
            )
        return current_user

    return _check_role
