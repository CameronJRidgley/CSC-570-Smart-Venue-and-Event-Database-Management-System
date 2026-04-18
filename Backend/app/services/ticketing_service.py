"""Ticketing & Seating business logic.

Responsibilities:
    * event / section lookups and availability math
    * transactional ticket purchase
    * ticket status transitions

Routes stay thin; all rules live here.
"""
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models.enums import (
    EventStatus,
    PaymentStatus,
    TicketStatus,
)
from app.models.sql.event import Event
from app.models.sql.ticket import Ticket
from app.repositories import (
    attendee_repo,
    event_repo,
    payment_repo,
    seating_repo,
    ticket_repo,
)
from app.schemas.availability import (
    EventAvailability,
    SectionAvailability,
)
from app.schemas.ticket import (
    TicketPurchaseRequest,
    TicketPurchaseResponse,
    TicketRead,
)
from app.services import qr_service


# ---------------------------------------------------------------------------
# Status-transition rules
# ---------------------------------------------------------------------------

_ALLOWED_TRANSITIONS: dict[TicketStatus, set[TicketStatus]] = {
    TicketStatus.VALID: {TicketStatus.USED, TicketStatus.CANCELLED, TicketStatus.REFUNDED},
    TicketStatus.USED: {TicketStatus.REFUNDED},
    TicketStatus.CANCELLED: set(),
    TicketStatus.REFUNDED: set(),
}


def _assert_transition(current: TicketStatus, new: TicketStatus) -> None:
    if new == current:
        return
    if new not in _ALLOWED_TRANSITIONS[current]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot transition ticket from {current.value} to {new.value}",
        )


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def list_events(session: Session, skip: int = 0, limit: int = 100) -> List[Event]:
    return event_repo.list_events(session, skip=skip, limit=limit)


def get_event_or_404(session: Session, event_id: int) -> Event:
    event = event_repo.get_event(session, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return event


def list_event_sections(session: Session, event_id: int):
    event = get_event_or_404(session, event_id)
    return seating_repo.list_sections_by_venue(session, event.venue_id)


def compute_availability(session: Session, event_id: int) -> EventAvailability:
    event = get_event_or_404(session, event_id)
    sections = seating_repo.list_sections_by_venue(session, event.venue_id)

    section_reports: list[SectionAvailability] = []
    for sec in sections:
        sold = ticket_repo.count_active_tickets_for_section(session, event.id, sec.id)
        section_reports.append(
            SectionAvailability(
                section_id=sec.id,
                section_name=sec.name,
                tier=sec.tier,
                capacity=sec.capacity,
                sold=sold,
                available=max(sec.capacity - sold, 0),
            )
        )

    total_sold = ticket_repo.count_active_tickets_for_event(session, event.id)
    return EventAvailability(
        event_id=event.id,
        event_capacity=event.capacity,
        total_sold=total_sold,
        total_available=max(event.capacity - total_sold, 0),
        sold_out=total_sold >= event.capacity,
        sections=section_reports,
    )


def get_ticket_or_404(session: Session, ticket_id: int) -> Ticket:
    ticket = ticket_repo.get_ticket(session, ticket_id)
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket not found")
    return ticket


def list_tickets_for_user(session: Session, user_id: int) -> List[Ticket]:
    # "user" == attendee in this milestone (auth comes in M9).
    return ticket_repo.list_tickets_by_attendee(session, user_id)


# ---------------------------------------------------------------------------
# Purchase flow (transactional)
# ---------------------------------------------------------------------------

def purchase_ticket(
    session: Session, req: TicketPurchaseRequest
) -> TicketPurchaseResponse:
    """Atomically create attendee (if needed), ticket, and payment.

    The entire flow runs in one DB transaction. If anything fails, the
    session is rolled back and nothing is persisted.
    """
    try:
        # 1. Lock the event row — serializes concurrent purchases per event.
        event = event_repo.get_event_for_update(session, req.event_id)
        if not event:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
        if event.status in (EventStatus.CANCELLED, EventStatus.COMPLETED):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Event is {event.status.value}; tickets cannot be purchased",
            )

        # 2. Validate section belongs to this event's venue.
        section = seating_repo.get_section(session, req.seating_section_id)
        if not section or section.venue_id != event.venue_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Seating section does not belong to this event's venue",
            )

        # 3. Enforce event-level capacity.
        if ticket_repo.count_active_tickets_for_event(session, event.id) >= event.capacity:
            raise HTTPException(status.HTTP_409_CONFLICT, "Event is sold out")

        # 4. Enforce section-level capacity.
        if (
            ticket_repo.count_active_tickets_for_section(session, event.id, section.id)
            >= section.capacity
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Section '{section.name}' is sold out",
            )

        # 5. If a specific seat is requested, ensure it's free.
        if req.seat_number and ticket_repo.seat_is_taken(
            session, event.id, section.id, req.seat_number
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Seat {req.seat_number} is already booked",
            )

        # 6. Resolve or create attendee.
        attendee = _resolve_attendee(session, req)

        # 7. Create ticket (with unique QR token).
        token = qr_service.generate_token()
        ticket = ticket_repo.create_ticket(
            session,
            event_id=event.id,
            section_id=section.id,
            attendee_id=attendee.id,
            seat_number=req.seat_number,
            qr_code=token,
            price=section.base_price,
        )

        # 8. Create payment. In this milestone we simulate success; a real
        #    gateway integration will replace this in a later phase.
        payment = payment_repo.create_payment(
            session,
            ticket_id=ticket.id,
            attendee_id=attendee.id,
            amount=section.base_price,
            method=req.payment_method,
            status=PaymentStatus.COMPLETED,
            transaction_ref=uuid4().hex,
        )

        session.commit()
        session.refresh(ticket)

    except HTTPException:
        session.rollback()
        raise
    except IntegrityError as exc:
        # DB-level unique-constraint (e.g. uq_ticket_event_section_seat) won
        # a race with our app-level check.
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Seat was booked by another request. Please try again.",
        ) from exc
    except Exception:
        session.rollback()
        raise

    return TicketPurchaseResponse(
        ticket=TicketRead.model_validate(ticket),
        qr_code_base64=qr_service.render_png_base64(token),
        payment_status=payment.status.value,
    )


def _resolve_attendee(session: Session, req: TicketPurchaseRequest):
    if req.attendee_id is not None:
        attendee = attendee_repo.get_attendee(session, req.attendee_id)
        if not attendee:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Attendee not found")
        return attendee

    if req.attendee is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Must provide attendee_id or inline attendee details",
        )

    existing = attendee_repo.get_attendee_by_email(session, req.attendee.email)
    if existing:
        return existing
    return attendee_repo.create_attendee(
        session,
        full_name=req.attendee.full_name,
        email=req.attendee.email,
        phone=req.attendee.phone,
    )


# ---------------------------------------------------------------------------
# Status updates
# ---------------------------------------------------------------------------

def update_ticket_status(
    session: Session, ticket_id: int, new_status: TicketStatus
) -> Ticket:
    ticket = get_ticket_or_404(session, ticket_id)
    _assert_transition(ticket.status, new_status)

    if new_status == ticket.status:
        return ticket

    ticket.status = new_status
    if new_status == TicketStatus.USED:
        from datetime import datetime
        ticket.used_at = datetime.utcnow()

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
