"""CrowdEvent document.

Time-series crowd telemetry ingested from sensors / cameras / manual
counts. Each document is one reading for a zone at a timestamp.
"""
from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel

from app.models.enums import CrowdAlertLevel, CrowdSource


class CrowdEvent(Document):
    event_id: int
    zone: str
    people_count: int = Field(ge=0)
    density: float = Field(ge=0)                # people per m^2 (optional)
    alert_level: CrowdAlertLevel = CrowdAlertLevel.NORMAL
    source: CrowdSource = CrowdSource.MANUAL
    sensor_id: Optional[str] = None
    threshold_breached: bool = False            # True when alert_level >= ELEVATED
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "crowd_events"
        indexes = [
            IndexModel([("event_id", 1), ("recorded_at", -1)]),
            IndexModel([("event_id", 1), ("zone", 1), ("recorded_at", -1)]),
            IndexModel([("alert_level", 1)]),
        ]
