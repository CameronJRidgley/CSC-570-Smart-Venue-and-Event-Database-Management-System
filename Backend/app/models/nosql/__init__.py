"""Mongo document registry.

`DOCUMENT_MODELS` is passed to Beanie at startup so it registers indexes
and enables ODM queries. Keep this list in sync when adding new docs.
"""
from app.models.nosql.crowd_event import CrowdEvent
from app.models.nosql.crowd_threshold import CrowdThreshold
from app.models.nosql.feedback import FeedbackStream
from app.models.nosql.incident_timeline import IncidentTimeline, TimelineUpdate
from app.models.nosql.scan_log import ScanLog

DOCUMENT_MODELS = [
    ScanLog,
    CrowdEvent,
    CrowdThreshold,
    IncidentTimeline,
    FeedbackStream,
]

__all__ = [
    "DOCUMENT_MODELS",
    "ScanLog",
    "CrowdEvent",
    "CrowdThreshold",
    "IncidentTimeline",
    "TimelineUpdate",
    "FeedbackStream",
]
