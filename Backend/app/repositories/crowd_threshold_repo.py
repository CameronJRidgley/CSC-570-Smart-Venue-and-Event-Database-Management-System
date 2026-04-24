"""Crowd threshold repository (MongoDB via Beanie).

Thresholds are keyed by (event_id, zone) with a unique index that makes
upserts atomic.
"""
from datetime import datetime
from typing import List, Optional

from app.models.nosql.crowd_threshold import CrowdThreshold


async def get(event_id: int, zone: str) -> Optional[CrowdThreshold]:
    return await CrowdThreshold.find_one(
        CrowdThreshold.event_id == event_id,
        CrowdThreshold.zone == zone,
    )


async def list_for_event(event_id: int) -> List[CrowdThreshold]:
    return await CrowdThreshold.find(
        CrowdThreshold.event_id == event_id
    ).to_list()


async def upsert(
    *,
    event_id: int,
    zone: str,
    elevated_at: int,
    high_at: int,
    critical_at: int,
) -> CrowdThreshold:
    existing = await get(event_id, zone)
    if existing is not None:
        existing.elevated_at = elevated_at
        existing.high_at = high_at
        existing.critical_at = critical_at
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return existing

    doc = CrowdThreshold(
        event_id=event_id,
        zone=zone,
        elevated_at=elevated_at,
        high_at=high_at,
        critical_at=critical_at,
    )
    await doc.insert()
    return doc
