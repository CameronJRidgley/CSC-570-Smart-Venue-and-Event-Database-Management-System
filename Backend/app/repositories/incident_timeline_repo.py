"""Incident timeline Mongo repository.

One IncidentTimeline document per Incident (keyed by `incident_id`).
All updates are appended to the `updates` array.
"""
from datetime import datetime
from typing import Optional

from app.models.nosql.incident_timeline import IncidentTimeline, TimelineUpdate


async def get_timeline(incident_id: int) -> Optional[IncidentTimeline]:
    return await IncidentTimeline.find_one(IncidentTimeline.incident_id == incident_id)


async def ensure_timeline(incident_id: int, event_id: int) -> IncidentTimeline:
    """Return the timeline doc, creating it lazily if missing."""
    existing = await get_timeline(incident_id)
    if existing:
        return existing
    timeline = IncidentTimeline(
        incident_id=incident_id,
        event_id=event_id,
        updates=[],
    )
    await timeline.insert()
    return timeline


async def append_update(
    incident_id: int, event_id: int, update: TimelineUpdate
) -> IncidentTimeline:
    timeline = await ensure_timeline(incident_id, event_id)
    timeline.updates.append(update)
    timeline.updated_at = datetime.utcnow()
    await timeline.save()
    return timeline
