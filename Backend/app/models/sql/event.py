# Author: Cameron Ridgley
# Copilot had helped me work through bugs and things to sharp up this file
"""Event table.

An Event is held at exactly one Venue. Capacity is denormalized onto the
Event so organizers can cap attendance below the venue's physical limit.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import EventStatus


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    venue_id: int = Field(foreign_key="venues.id", index=True)

    starts_at: datetime
    ends_at: datetime

    status: EventStatus = Field(default=EventStatus.DRAFT, index=True)
    capacity: int = Field(ge=0)
    # Per-event ticket price set by the organizer at creation time.
    # Falls back to the venue's seat base_price when not set.
    ticket_price: Optional[float] = Field(default=None, ge=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
