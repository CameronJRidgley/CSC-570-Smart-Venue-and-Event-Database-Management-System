"""Ticket repository."""
from typing import List, Optional

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.enums import TicketStatus
from app.models.sql.ticket import Ticket

# Tickets that count against capacity (a cancelled/refunded seat is free again).
ACTIVE_STATUSES: tuple[TicketStatus, ...] = (TicketStatus.VALID, TicketStatus.USED)


def get_ticket(session: Session, ticket_id: int) -> Optional[Ticket]:
    return session.get(Ticket, ticket_id)


def get_ticket_by_qr(session: Session, qr_code: str) -> Optional[Ticket]:
    stmt = select(Ticket).where(Ticket.qr_code == qr_code)
    return session.exec(stmt).first()


def get_active_ticket_by_email_for_event(
    session: Session, email: str, event_id: int
) -> List[Ticket]:
    """Return VALID tickets for a given email within a specific event.

    Used for manual check-in fallback. Returns a list so the caller can
    detect ambiguity (multiple active tickets for the same email).
    """
    from app.models.sql.attendee import Attendee

    stmt = (
        select(Ticket)
        .join(Attendee, Attendee.id == Ticket.attendee_id)
        .where(
            Attendee.email == email,
            Ticket.event_id == event_id,
            Ticket.status == TicketStatus.VALID,
        )
    )
    return list(session.exec(stmt).all())


def count_by_status_for_event(
    session: Session, event_id: int, ticket_status: TicketStatus
) -> int:
    stmt = select(func.count(Ticket.id)).where(
        Ticket.event_id == event_id,
        Ticket.status == ticket_status,
    )
    return int(session.exec(stmt).one())


def list_tickets_by_attendee(session: Session, attendee_id: int) -> List[Ticket]:
    stmt = select(Ticket).where(Ticket.attendee_id == attendee_id)
    return list(session.exec(stmt).all())


def count_active_tickets_for_event(session: Session, event_id: int) -> int:
    stmt = select(func.count(Ticket.id)).where(
        Ticket.event_id == event_id,
        Ticket.status.in_(ACTIVE_STATUSES),
    )
    return int(session.exec(stmt).one())


def count_active_tickets_for_section(
    session: Session, event_id: int, section_id: int
) -> int:
    stmt = select(func.count(Ticket.id)).where(
        Ticket.event_id == event_id,
        Ticket.seating_section_id == section_id,
        Ticket.status.in_(ACTIVE_STATUSES),
    )
    return int(session.exec(stmt).one())


def seat_is_taken(
    session: Session, event_id: int, section_id: int, seat_number: str
) -> bool:
    stmt = select(Ticket.id).where(
        Ticket.event_id == event_id,
        Ticket.seating_section_id == section_id,
        Ticket.seat_number == seat_number,
        Ticket.status.in_(ACTIVE_STATUSES),
    )
    return session.exec(stmt).first() is not None


def create_ticket(
    session: Session,
    *,
    event_id: int,
    section_id: int,
    attendee_id: int,
    seat_number: Optional[str],
    qr_code: str,
    price: float,
) -> Ticket:
    ticket = Ticket(
        event_id=event_id,
        seating_section_id=section_id,
        attendee_id=attendee_id,
        seat_number=seat_number,
        qr_code=qr_code,
        price=price,
        status=TicketStatus.VALID,
    )
    session.add(ticket)
    session.flush()
    return ticket
