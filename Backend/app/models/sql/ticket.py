"""Ticket table.

A Ticket binds an Attendee to an Event + SeatingSection, at an optional
specific seat. `qr_code` is a unique opaque token embedded in the
generated QR image and scanned at check-in. Uniqueness of
(event_id, seating_section_id, seat_number) prevents double-booking of a
specific seat within a section.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.enums import TicketStatus


class Ticket(SQLModel, table=True):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "seating_section_id",
            "seat_number",
            name="uq_ticket_event_section_seat",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id", index=True)
    seating_section_id: int = Field(foreign_key="seating_sections.id", index=True)
    attendee_id: int = Field(foreign_key="attendees.id", index=True)

    seat_number: Optional[str] = Field(default=None, max_length=20)
    qr_code: str = Field(max_length=128, unique=True, index=True)

    price: float = Field(ge=0)
    status: TicketStatus = Field(default=TicketStatus.VALID, index=True)

    issued_at: datetime = Field(default_factory=datetime.utcnow)
    used_at: Optional[datetime] = Field(default=None)
