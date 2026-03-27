from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/token",
    response_model=Token,
    summary="Login",
    description="Authenticate with email and password to receive a JWT access token.",
    responses={
        401: {"description": "Incorrect email or password"},
        403: {"description": "User account is inactive"},
    },
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return JWT access token."""
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise UnauthorizedError(detail="Incorrect email or password")
    if not user.is_active:
        raise ForbiddenError(detail="Inactive user")
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Retrieve the profile of the currently authenticated user.",
    responses={401: {"description": "Not authenticated"}},
)
async def read_current_user(
    current_user: User = Depends(get_current_active_user),
):
    """Get current authenticated user profile."""
    return current_user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register new user",
    description="Create a new user account. Email must be unique across the system.",
    responses={
        409: {"description": "Email already registered"},
        422: {"description": "Invalid input data"},
    },
)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if result.scalar_one_or_none() is not None:
        raise ConflictError(detail="Email already registered")
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
