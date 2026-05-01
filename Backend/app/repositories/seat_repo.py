"""Seat repository."""
from typing import List, Optional

from sqlmodel import Session, select

from app.models.sql.venue import Seat


def get_seat(session: Session, seat_id: int) -> Optional[Seat]:
    return session.get(Seat, seat_id)


def list_seats_by_venue(session: Session, venue_id: int) -> List[Seat]:
    stmt = select(Seat).where(Seat.venue_id == venue_id)
    return list(session.exec(stmt).all())