from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    IncidentUpdateType,
)


class IncidentBase(BaseModel):
    event_id: int
    title: str = Field(max_length=200)
    description: str = Field(max_length=2000)
    location: Optional[str] = Field(default=None, max_length=200)
    category: IncidentCategory = IncidentCategory.OTHER
    severity: IncidentSeverity = IncidentSeverity.LOW


class IncidentCreate(IncidentBase):
    reporter_staff_id: int
    assigned_staff_id: Optional[int] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    category: Optional[IncidentCategory] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_staff_id: Optional[int] = None
    resolution_summary: Optional[str] = None
    actor_staff_id: Optional[int] = None        # who is making the change
    note: Optional[str] = None                   # optional timeline note


class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reporter_staff_id: int
    assigned_staff_id: Optional[int]
    status: IncidentStatus
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]


class IncidentEscalateRequest(BaseModel):
    actor_staff_id: Optional[int] = None
    target_severity: Optional[IncidentSeverity] = None   # default: next level up
    note: Optional[str] = None


# --- Timeline (Mongo) ---

class TimelineUpdateCreate(BaseModel):
    message: str
    update_type: IncidentUpdateType = IncidentUpdateType.NOTE
    author_staff_id: Optional[int] = None
    status_change: Optional[IncidentStatus] = None
    severity_change: Optional[IncidentSeverity] = None


class TimelineUpdateRead(BaseModel):
    update_type: IncidentUpdateType
    author_staff_id: Optional[int]
    message: str
    status_change: Optional[IncidentStatus]
    severity_change: Optional[IncidentSeverity]
    timestamp: datetime


class IncidentTimelineRead(BaseModel):
    incident_id: int
    event_id: int
    updates: List[TimelineUpdateRead]
    created_at: datetime
    updated_at: datetime


class IncidentDetailRead(BaseModel):
    """Full incident view: SQL state + Mongo timeline."""
    incident: IncidentRead
    timeline: Optional[IncidentTimelineRead] = None


class IncidentSummary(BaseModel):
    """Lightweight entry used in event-scoped listings."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    title: str
    category: IncidentCategory
    severity: IncidentSeverity
    status: IncidentStatus
    assigned_staff_id: Optional[int]
    created_at: datetime
    updated_at: datetime
