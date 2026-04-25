"""Attendee table.

An Attendee is a person who holds tickets. Email is unique so the same
person isn't duplicated across multiple ticket purchases.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Attendee(SQLModel, table=True):
    __tablename__ = "attendees"

    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=200)
    email: str = Field(max_length=320, unique=True, index=True)
    phone: Optional[str] = Field(default=None, max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow)
