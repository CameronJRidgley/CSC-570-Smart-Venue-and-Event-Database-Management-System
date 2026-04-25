"""Crowd event ingestion, classification, and alerting."""
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.enums import CROWD_LEVEL_ORDER, CrowdAlertLevel
from app.models.nosql.crowd_event import CrowdEvent
from app.models.nosql.crowd_threshold import CrowdThreshold
from app.models.sql.event import Event
from app.repositories import crowd_event_repo, crowd_threshold_repo
from app.schemas.crowd import (
    CrowdAlert,
    CrowdEventCreate,
    CrowdEventRead,
    CrowdIngestResponse,
    CrowdThresholdRead,
    CrowdThresholdUpsert,
    EventZoneSnapshot,
    ZoneLatest,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_event_exists(session: Session, event_id: int) -> None:
    if session.get(Event, event_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")


def _classify(
    people_count: int, threshold: Optional[CrowdThreshold]
) -> Tuple[CrowdAlertLevel, Optional[int]]:
    """Map a people_count to an alert level using the zone threshold.

    Returns (level, triggered_boundary). When no threshold exists we
    return NORMAL and None; the caller decides whether to flag
    `threshold_missing` in the response.
    """
    if threshold is None:
        return CrowdAlertLevel.NORMAL, None

    if people_count >= threshold.critical_at:
        return CrowdAlertLevel.CRITICAL, threshold.critical_at
    if people_count >= threshold.high_at:
        return CrowdAlertLevel.HIGH, threshold.high_at
    if people_count >= threshold.elevated_at:
        return CrowdAlertLevel.ELEVATED, threshold.elevated_at
    return CrowdAlertLevel.NORMAL, None


def _to_read(doc: CrowdEvent) -> CrowdEventRead:
    return CrowdEventRead(
        id=str(doc.id),
        event_id=doc.event_id,
        zone=doc.zone,
        people_count=doc.people_count,
        density=doc.density,
        alert_level=doc.alert_level,
        source=doc.source,
        sensor_id=doc.sensor_id,
        threshold_breached=doc.threshold_breached,
        recorded_at=doc.recorded_at,
    )


def _threshold_read(doc: CrowdThreshold) -> CrowdThresholdRead:
    return CrowdThresholdRead(
        event_id=doc.event_id,
        zone=doc.zone,
        elevated_at=doc.elevated_at,
        high_at=doc.high_at,
        critical_at=doc.critical_at,
        updated_at=doc.updated_at,
    )


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

async def ingest(
    session: Session, payload: CrowdEventCreate
) -> CrowdIngestResponse:
    _assert_event_exists(session, payload.event_id)

    threshold = await crowd_threshold_repo.get(payload.event_id, payload.zone)
    level, triggered = _classify(payload.people_count, threshold)
    breached = CROWD_LEVEL_ORDER[level.value] >= CROWD_LEVEL_ORDER["elevated"]

    doc = CrowdEvent(
        event_id=payload.event_id,
        zone=payload.zone,
        people_count=payload.people_count,
        density=payload.density,
        alert_level=level,
        source=payload.source,
        sensor_id=payload.sensor_id,
        threshold_breached=breached,
        recorded_at=payload.recorded_at or datetime.utcnow(),
    )
    doc = await crowd_event_repo.create(doc)

    alert: Optional[CrowdAlert] = None
    if breached and triggered is not None:
        alert = CrowdAlert(
            event_id=doc.event_id,
            zone=doc.zone,
            people_count=doc.people_count,
            density=doc.density,
            alert_level=doc.alert_level,
            threshold_triggered=triggered,
            recorded_at=doc.recorded_at,
            reading_id=str(doc.id),
        )

    if threshold is None:
        message = (
            f"Reading accepted. No threshold configured for zone '{payload.zone}'; "
            "classified as NORMAL."
        )
    elif breached:
        message = f"Threshold breached: {level.value.upper()}."
    else:
        message = f"Reading accepted. Level: {level.value}."

    return CrowdIngestResponse(
        reading=_to_read(doc),
        alert=alert,
        threshold_missing=threshold is None,
        message=message,
    )


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

async def list_event_readings(
    session: Session, event_id: int, limit: int = 100, skip: int = 0
) -> List[CrowdEventRead]:
    _assert_event_exists(session, event_id)
    docs = await crowd_event_repo.list_for_event(event_id, limit=limit, skip=skip)
    return [_to_read(d) for d in docs]


async def zone_snapshot(session: Session, event_id: int) -> EventZoneSnapshot:
    _assert_event_exists(session, event_id)
    latest = await crowd_event_repo.latest_per_zone(event_id)
    return EventZoneSnapshot(
        event_id=event_id,
        zones=[ZoneLatest(zone=d.zone, latest=_to_read(d)) for d in latest],
    )


async def list_alerts(
    session: Session, event_id: int, limit: int = 100, skip: int = 0
) -> List[CrowdAlert]:
    _assert_event_exists(session, event_id)
    docs = await crowd_event_repo.list_alerts_for_event(event_id, limit=limit, skip=skip)

    # Thresholds at read-time explain which boundary each reading crossed.
    thresholds = await crowd_threshold_repo.list_for_event(event_id)
    threshold_by_zone = {t.zone: t for t in thresholds}

    alerts: List[CrowdAlert] = []
    for d in docs:
        t = threshold_by_zone.get(d.zone)
        triggered = _boundary_for_level(d.alert_level, t) if t else 0
        alerts.append(
            CrowdAlert(
                event_id=d.event_id,
                zone=d.zone,
                people_count=d.people_count,
                density=d.density,
                alert_level=d.alert_level,
                threshold_triggered=triggered,
                recorded_at=d.recorded_at,
                reading_id=str(d.id),
            )
        )
    return alerts


def _boundary_for_level(
    level: CrowdAlertLevel, t: CrowdThreshold
) -> int:
    return {
        CrowdAlertLevel.ELEVATED: t.elevated_at,
        CrowdAlertLevel.HIGH: t.high_at,
        CrowdAlertLevel.CRITICAL: t.critical_at,
    }.get(level, 0)


# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------

async def upsert_threshold(
    session: Session, payload: CrowdThresholdUpsert
) -> CrowdThresholdRead:
    _assert_event_exists(session, payload.event_id)
    doc = await crowd_threshold_repo.upsert(
        event_id=payload.event_id,
        zone=payload.zone,
        elevated_at=payload.elevated_at,
        high_at=payload.high_at,
        critical_at=payload.critical_at,
    )
    return _threshold_read(doc)
