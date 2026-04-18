"""Event-centric endpoints. Thin: delegate to ticketing_service."""
from typing import List

from fastapi import APIRouter, Query

from app.core.dependencies import SessionDep
from app.schemas.availability import EventAvailability
from app.schemas.event import EventRead
from app.schemas.seating import SeatingSectionRead
from app.services import ticketing_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventRead])
def get_events(
    session: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return ticketing_service.list_events(session, skip=skip, limit=limit)


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: int, session: SessionDep):
    return ticketing_service.get_event_or_404(session, event_id)


@router.get("/{event_id}/seats", response_model=List[SeatingSectionRead])
def get_event_seats(event_id: int, session: SessionDep):
    """Seating sections available for this event's venue."""
    return ticketing_service.list_event_sections(session, event_id)


@router.get("/{event_id}/availability", response_model=EventAvailability)
def get_event_availability(event_id: int, session: SessionDep):
    return ticketing_service.compute_availability(session, event_id)
