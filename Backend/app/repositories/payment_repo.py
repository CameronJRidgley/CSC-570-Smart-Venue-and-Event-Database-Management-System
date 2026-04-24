"""Payment repository."""
from typing import Optional

from sqlmodel import Session

from app.models.enums import PaymentMethod, PaymentStatus
from app.models.sql.payment import Payment


def create_payment(
    session: Session,
    *,
    ticket_id: int,
    attendee_id: int,
    amount: float,
    method: PaymentMethod,
    status: PaymentStatus = PaymentStatus.COMPLETED,
    transaction_ref: Optional[str] = None,
) -> Payment:
    payment = Payment(
        ticket_id=ticket_id,
        attendee_id=attendee_id,
        amount=amount,
        method=method,
        status=status,
        transaction_ref=transaction_ref,
    )
    session.add(payment)
    session.flush()
    return payment
