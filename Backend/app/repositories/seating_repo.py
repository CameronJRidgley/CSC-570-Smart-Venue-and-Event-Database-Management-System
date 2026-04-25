"""Seating section repository."""
from typing import List, Optional

from sqlmodel import Session, select

from app.models.sql.venue import SeatingSection


def get_section(session: Session, section_id: int) -> Optional[SeatingSection]:
    return session.get(SeatingSection, section_id)


def list_sections_by_venue(session: Session, venue_id: int) -> List[SeatingSection]:
    stmt = select(SeatingSection).where(SeatingSection.venue_id == venue_id)
    return list(session.exec(stmt).all())
