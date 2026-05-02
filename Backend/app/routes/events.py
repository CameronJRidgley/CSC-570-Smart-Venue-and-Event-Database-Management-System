# Author: Cameron Ridgley
# Copilot had helped me work through bugs and things to sharp up this file
"""Event browsing endpoints.

Powers the **Attendee Portal** modules:
  - Event Search        → GET /api/events
  - Event Details       → GET /api/events/{event_id}
  - Seat Selection      → GET /api/events/{event_id}/seats
  - Live availability   → GET /api/events/{event_id}/availability

Also used by the **Organizer Dashboard** when pre-filling event pickers.
Thin HTTP layer — all business logic lives in `ticketing_service`.

AI_ASSIST: Endpoint design and pagination patterns were developed with
Claude Opus 4.6. See Backend/AI_ASSIST.md for full architecture attribution.
"""
from typing import List

from fastapi import APIRouter, Query, status

from app.core.dependencies import SessionDep
from app.schemas.availability import EventAvailability
from app.schemas.event import EventCreate, EventRead
from app.schemas.seating import SeatRead
from app.schemas.venue import VenueRead
from app.services import ticketing_service

router = APIRouter(prefix="/events", tags=["events"])


def _enrich(event, session) -> EventRead:
    """Build an EventRead with derived `price` (event price or min seat) and `spots_left`."""
    from app.repositories import seat_repo, ticket_repo
    seats = seat_repo.list_seats_by_venue(session, event.venue_id)
    if event.ticket_price is not None:
        price = float(event.ticket_price)
    else:
        price = float(min((s.base_price for s in seats), default=0.0)) if seats else 0.0
    sold = ticket_repo.count_active_tickets_for_event(session, event.id)
    data = EventRead.model_validate(event).model_dump()
    data["price"] = price
    data["spots_left"] = max(event.capacity - sold, 0)
    return EventRead(**data)


@router.get("", response_model=List[EventRead])
def get_events(
    session: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    events = ticketing_service.list_events(session, skip=skip, limit=limit)
    return [_enrich(e, session) for e in events]


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, session: SessionDep):
    return ticketing_service.create_event(session, payload)


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, session: SessionDep):
    return _enrich(ticketing_service.get_event_or_404(session, event_id), session)


@router.get("/{event_id}/seats", response_model=List[SeatRead])
def get_event_seats(event_id: int, session: SessionDep):
    """Seats available for this event's venue."""
    return ticketing_service.list_event_seats(session, event_id)


@router.get("/{event_id}/availability", response_model=EventAvailability)
def get_event_availability(event_id: int, session: SessionDep):
    return ticketing_service.compute_availability(session, event_id)


# Venues router (small, lives here so we don't need a separate file)
venues_router = APIRouter(prefix="/venues", tags=["venues"])


@venues_router.get("", response_model=List[VenueRead])
def list_venues(session: SessionDep):
    return ticketing_service.list_venues(session)
