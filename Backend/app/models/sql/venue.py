"""Venue and SeatingSection tables.

A Venue is a physical location. Each Venue has many SeatingSections
(e.g. 'Floor', 'Balcony', 'VIP Box') that define capacity and price tier.
Tickets are issued against a (event, seating_section) pair so capacity
can be enforced per section.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import SeatingTier


class Venue(SQLModel, table=True):
    __tablename__ = "venues"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=200)
    address: str = Field(max_length=500)
    city: str = Field(max_length=100)
    total_capacity: int = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SeatingSection(SQLModel, table=True):
    __tablename__ = "seating_sections"

    id: Optional[int] = Field(default=None, primary_key=True)
    venue_id: int = Field(foreign_key="venues.id", index=True)
    name: str = Field(max_length=100)
    tier: SeatingTier = Field(default=SeatingTier.GENERAL)
    capacity: int = Field(ge=0)
    base_price: float = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
