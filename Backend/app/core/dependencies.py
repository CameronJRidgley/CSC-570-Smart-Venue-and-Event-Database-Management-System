"""Shared FastAPI dependencies."""
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel import Session

from app.core.security import decode_access_token
from app.db.sql import get_session
from app.models.enums import UserRole
from app.models.sql.user import User
from app.repositories import user_repo

SessionDep = Annotated[Session, Depends(get_session)]

_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    session: SessionDep,
    token: Annotated[Optional[str], Depends(_oauth2)],
) -> User:
    if not token:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Missing bearer token"
        )
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid or expired token"
        ) from exc

    sub = payload.get("sub")
    try:
        user_id = int(sub) if sub is not None else None
    except (TypeError, ValueError):
        user_id = None
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token")

    user = user_repo.get_user(session, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """Factory that returns a dependency enforcing the caller has one of `roles`."""

    def _dep(user: CurrentUserDep) -> User:
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Insufficient role for this operation",
            )
        return user

    return _dep
