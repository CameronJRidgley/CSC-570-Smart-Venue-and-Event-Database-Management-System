"""Attendee repository."""
from typing import Optional

from sqlmodel import Session, select

from app.models.sql.attendee import Attendee


def get_attendee(session: Session, attendee_id: int) -> Optional[Attendee]:
    return session.get(Attendee, attendee_id)


def get_attendee_by_email(session: Session, email: str) -> Optional[Attendee]:
    stmt = select(Attendee).where(Attendee.email == email)
    return session.exec(stmt).first()


def create_attendee(
    session: Session, full_name: str, email: str, phone: Optional[str] = None
) -> Attendee:
    attendee = Attendee(full_name=full_name, email=email, phone=phone)
    session.add(attendee)
    session.flush()
    return attendee
