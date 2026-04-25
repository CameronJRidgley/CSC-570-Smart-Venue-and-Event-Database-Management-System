"""CrowdThreshold document.

One document per (event_id, zone). Defines the people-count boundaries
that classify a reading into ELEVATED / HIGH / CRITICAL. Missing
thresholds for a zone cause ingestion to default to NORMAL with a note
in the response (ingestion never fails because thresholds are absent).
"""
from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import IndexModel


class CrowdThreshold(Document):
    event_id: int
    zone: str
    elevated_at: int = Field(ge=0)
    high_at: int = Field(ge=0)
    critical_at: int = Field(ge=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "crowd_thresholds"
        indexes = [
            IndexModel([("event_id", 1), ("zone", 1)], unique=True),
        ]
