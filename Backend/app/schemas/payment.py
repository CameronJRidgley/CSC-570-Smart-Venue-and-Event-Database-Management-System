from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import PaymentMethod, PaymentStatus


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticket_id: int
    attendee_id: int
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    transaction_ref: Optional[str]
    created_at: datetime
