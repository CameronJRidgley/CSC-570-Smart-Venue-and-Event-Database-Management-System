"""Payment table.

Stores payment records linked to a Ticket. Kept 1:1 with Ticket for
simplicity (refunds create a new row with status=REFUNDED referencing
the same ticket).
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import PaymentMethod, PaymentStatus


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="tickets.id", index=True)
    attendee_id: int = Field(foreign_key="attendees.id", index=True)

    amount: float = Field(ge=0)
    method: PaymentMethod = Field(default=PaymentMethod.CARD)
    status: PaymentStatus = Field(default=PaymentStatus.PENDING, index=True)
    transaction_ref: Optional[str] = Field(default=None, max_length=128, index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
