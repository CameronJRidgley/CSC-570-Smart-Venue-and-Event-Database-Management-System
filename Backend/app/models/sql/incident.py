"""Incident table (core record).

The relational record holds the authoritative incident data (assignment,
severity, status). The evolving timeline of updates lives in the Mongo
document `IncidentTimeline` because it is append-heavy and schema-loose.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import IncidentCategory, IncidentSeverity, IncidentStatus


class Incident(SQLModel, table=True):
    __tablename__ = "incidents"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id", index=True)

    reporter_staff_id: int = Field(foreign_key="staff.id", index=True)
    assigned_staff_id: Optional[int] = Field(
        default=None, foreign_key="staff.id", index=True
    )

    title: str = Field(max_length=200)
    description: str = Field(max_length=2000)
    location: Optional[str] = Field(default=None, max_length=200)
    resolution_summary: Optional[str] = Field(default=None, max_length=2000)

    category: IncidentCategory = Field(default=IncidentCategory.OTHER, index=True)
    severity: IncidentSeverity = Field(default=IncidentSeverity.LOW, index=True)
    status: IncidentStatus = Field(default=IncidentStatus.OPEN, index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)
