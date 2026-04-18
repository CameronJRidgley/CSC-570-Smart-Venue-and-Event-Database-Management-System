"""Authentication endpoints (shared across all portals).

  - Register a user   → POST /api/auth/register
  - Log in, get JWT   → POST /api/auth/login
  - Current user      → GET  /api/auth/me

Tokens are HS256-signed JWTs carrying `sub` (user id), `role`, and
`email`. Send `Authorization: Bearer <token>` on authenticated calls.
"""
from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserDep, SessionDep
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, session: SessionDep):
    return auth_service.register(session, payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: SessionDep):
    return auth_service.login(session, payload)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUserDep):
    return user
