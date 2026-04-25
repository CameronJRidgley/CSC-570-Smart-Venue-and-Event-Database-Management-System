"""Application user (authentication identity).

Kept separate from `Staff` and `Attendee` so an auth user can be linked
to either (or neither, e.g. an admin). Milestone 9 scaffolding only —
existing routes are not gated yet.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import UserRole


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(max_length=320, unique=True, index=True)
    hashed_password: str = Field(max_length=200)
    full_name: Optional[str] = Field(default=None, max_length=200)
    role: UserRole = Field(default=UserRole.ATTENDEE, index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
