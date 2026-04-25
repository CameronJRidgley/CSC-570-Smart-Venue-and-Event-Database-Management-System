"""IncidentTimeline document.

One document per Incident (keyed by the SQL incident_id). Each update to
the incident (status change, comment, escalation) is appended to
`updates`. Append-only, per-incident growth — ideal for Mongo.
"""
from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel

from app.models.enums import IncidentSeverity, IncidentStatus, IncidentUpdateType


class TimelineUpdate(BaseModel):
    update_type: IncidentUpdateType = IncidentUpdateType.NOTE
    author_staff_id: Optional[int] = None
    message: str
    status_change: Optional[IncidentStatus] = None
    severity_change: Optional[IncidentSeverity] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class IncidentTimeline(Document):
    incident_id: int
    event_id: int
    updates: List[TimelineUpdate] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "incidents"   # team-aligned collection name
        indexes = [
            IndexModel([("incident_id", 1)], unique=True),
            IndexModel([("event_id", 1)]),
        ]
