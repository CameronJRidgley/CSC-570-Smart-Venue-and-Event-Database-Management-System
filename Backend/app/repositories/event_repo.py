"""Event repository — only talks to the DB."""
from typing import List, Optional

from sqlmodel import Session, select

from app.models.sql.event import Event


def list_events(session: Session, skip: int = 0, limit: int = 100) -> List[Event]:
    return list(session.exec(select(Event).offset(skip).limit(limit)).all())


def get_event(session: Session, event_id: int) -> Optional[Event]:
    return session.get(Event, event_id)


def get_event_for_update(session: Session, event_id: int) -> Optional[Event]:
    """Row-level lock on the event so concurrent purchases serialize."""
    stmt = select(Event).where(Event.id == event_id).with_for_update()
    return session.exec(stmt).first()
