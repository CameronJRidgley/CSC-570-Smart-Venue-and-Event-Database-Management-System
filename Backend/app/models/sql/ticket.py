# Author: Cameron Ridgley
# Copilot had helped me work through bugs and things to sharp up this file
"""Ticket table.

A Ticket binds an Attendee to an Event + Seat, at an optional specific
seat number. `qr_code` is a unique opaque token embedded in the
generated QR image and scanned at check-in. Uniqueness of
(event_id, seat_id, seat_number) prevents double-booking of a specific
seat within a seat block.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.enums import TicketStatus


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"
    __table_args__ = (
        # A specific seat (event_id, seat_id, seat_number) can only be sold
        # once. NULL seat_number is treated as distinct by Postgres, so
        # General-Admission rows (no specific seat) can be sold up to
        # `seat.capacity` times — capacity is enforced in the service layer.
        UniqueConstraint(
            "event_id",
            "seat_id",
            "seat_number",
            name="uq_ticket_seat",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id", index=True)
    seat_id: int = Field(foreign_key="seats.id", index=True)   
    attendee_id: int = Field(foreign_key="attendees.id", index=True)
  

    seat_number: Optional[str] = Field(default=None, max_length=20)
    qr_code: str = Field(max_length=128, unique=True, index=True)

    price: float = Field(ge=0)
    status: TicketStatus = Field(default=TicketStatus.VALID, index=True)

    issued_at: datetime = Field(default_factory=datetime.utcnow)
    used_at: Optional[datetime] = Field(default=None)
