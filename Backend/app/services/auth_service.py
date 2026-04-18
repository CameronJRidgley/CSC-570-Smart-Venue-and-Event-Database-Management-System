"""Authentication business logic."""
from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.sql.user import User
from app.repositories import user_repo
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserRead

_settings = get_settings()


def register(session: Session, payload: UserCreate) -> UserRead:
    if user_repo.get_user_by_email(session, payload.email) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Email is already registered"
        )
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    user = user_repo.create_user(session, user)
    return UserRead.model_validate(user)


def login(session: Session, payload: LoginRequest) -> TokenResponse:
    user = user_repo.get_user_by_email(session, payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role.value, "email": user.email},
    )
    return TokenResponse(
        access_token=token,
        expires_in=_settings.jwt_expires_minutes * 60,
        user=UserRead.model_validate(user),
    )
