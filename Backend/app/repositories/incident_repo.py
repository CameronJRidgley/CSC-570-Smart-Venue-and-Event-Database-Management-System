"""Incident SQL repository."""
from typing import List, Optional

from sqlmodel import Session, select

from app.models.sql.incident import Incident


def get_incident(session: Session, incident_id: int) -> Optional[Incident]:
    return session.get(Incident, incident_id)


def list_incidents_for_event(session: Session, event_id: int) -> List[Incident]:
    stmt = select(Incident).where(Incident.event_id == event_id).order_by(
        Incident.created_at.desc()
    )
    return list(session.exec(stmt).all())


def save(session: Session, incident: Incident) -> Incident:
    session.add(incident)
    session.commit()
    session.refresh(incident)
    return incident
