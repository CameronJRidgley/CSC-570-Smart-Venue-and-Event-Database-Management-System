from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMethod, TicketStatus
from app.schemas.attendee import AttendeeCreate


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    seating_section_id: int
    attendee_id: int
    seat_number: Optional[str]
    qr_code: str
    price: float
    status: TicketStatus
    issued_at: datetime
    used_at: Optional[datetime]


class TicketPurchaseRequest(BaseModel):
    """Input for buying a ticket.

    The attendee may already exist (by id) or be created inline.
    Seat number is optional for general-admission sections.
    """
    event_id: int
    seating_section_id: int
    seat_number: Optional[str] = Field(default=None, max_length=20)

    attendee_id: Optional[int] = None
    attendee: Optional[AttendeeCreate] = None

    payment_method: PaymentMethod = PaymentMethod.CARD

    @property
    def has_attendee_reference(self) -> bool:
        return self.attendee_id is not None or self.attendee is not None


class TicketPurchaseResponse(BaseModel):
    ticket: TicketRead
    qr_code_base64: str              # PNG bytes base64-encoded
    payment_status: str


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
