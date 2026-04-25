from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.enums import CrowdAlertLevel, CrowdSource


class CrowdEventCreate(BaseModel):
    event_id: int
    zone: str = Field(min_length=1, max_length=100)
    people_count: int = Field(ge=0)
    density: float = Field(default=0.0, ge=0)
    source: CrowdSource = CrowdSource.MANUAL
    sensor_id: Optional[str] = None
    recorded_at: Optional[datetime] = None   # server fills if omitted


class CrowdEventRead(BaseModel):
    id: str                                  # Mongo ObjectId as string
    event_id: int
    zone: str
    people_count: int
    density: float
    alert_level: CrowdAlertLevel
    source: CrowdSource
    sensor_id: Optional[str]
    threshold_breached: bool
    recorded_at: datetime


class CrowdIngestResponse(BaseModel):
    """Returned by POST /crowd/events.

    `alert` is non-null only when the reading breached a configured
    threshold (alert_level >= ELEVATED).
    """
    reading: CrowdEventRead
    alert: Optional["CrowdAlert"] = None
    threshold_missing: bool = False          # True if no threshold configured
    message: str


class CrowdAlert(BaseModel):
    event_id: int
    zone: str
    people_count: int
    density: float
    alert_level: CrowdAlertLevel
    threshold_triggered: int                 # the boundary that was crossed
    recorded_at: datetime
    reading_id: str


class CrowdThresholdUpsert(BaseModel):
    event_id: int
    zone: str = Field(min_length=1, max_length=100)
    elevated_at: int = Field(ge=0)
    high_at: int = Field(ge=0)
    critical_at: int = Field(ge=0)

    @model_validator(mode="after")
    def _ordered(self):
        if not (self.elevated_at < self.high_at < self.critical_at):
            raise ValueError(
                "Thresholds must satisfy: elevated_at < high_at < critical_at"
            )
        return self


class CrowdThresholdRead(BaseModel):
    event_id: int
    zone: str
    elevated_at: int
    high_at: int
    critical_at: int
    updated_at: datetime


class ZoneLatest(BaseModel):
    """Most recent reading for a zone — powers organizer dashboards."""
    zone: str
    latest: CrowdEventRead


class EventZoneSnapshot(BaseModel):
    event_id: int
    zones: List[ZoneLatest]


CrowdIngestResponse.model_rebuild()
