"""Crowd event repository (MongoDB via Beanie)."""
from typing import List, Optional

from app.models.enums import CrowdAlertLevel
from app.models.nosql.crowd_event import CrowdEvent


async def create(event: CrowdEvent) -> CrowdEvent:
    await event.insert()
    return event


async def list_for_event(
    event_id: int, limit: int = 100, skip: int = 0
) -> List[CrowdEvent]:
    return (
        await CrowdEvent.find(CrowdEvent.event_id == event_id)
        .sort(-CrowdEvent.recorded_at)
        .skip(skip)
        .limit(limit)
        .to_list()
    )


async def list_alerts_for_event(
    event_id: int, limit: int = 100, skip: int = 0
) -> List[CrowdEvent]:
    """Alerts = breached readings sorted newest first."""
    return (
        await CrowdEvent.find(
            CrowdEvent.event_id == event_id,
            CrowdEvent.threshold_breached == True,  # noqa: E712
        )
        .sort(-CrowdEvent.recorded_at)
        .skip(skip)
        .limit(limit)
        .to_list()
    )


async def latest_per_zone(event_id: int) -> List[CrowdEvent]:
    """Return the most recent reading for each zone of the event."""
    pipeline = [
        {"$match": {"event_id": event_id}},
        {"$sort": {"recorded_at": -1}},
        {"$group": {"_id": "$zone", "doc": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$doc"}},
        {"$sort": {"zone": 1}},
    ]
    raw = await CrowdEvent.get_motor_collection().aggregate(pipeline).to_list(length=None)
    return [CrowdEvent.model_validate(doc) for doc in raw]
