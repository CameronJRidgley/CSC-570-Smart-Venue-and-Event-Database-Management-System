"""Incident management business logic.

Design notes:
    * SQL `Incident` row holds authoritative state
      (status, severity, assignee, resolution_summary).
    * Mongo `IncidentTimeline` holds the append-only history of all
      actions taken on the incident.
    * Timeline writes are best-effort: if Mongo is down, the SQL state
      still advances and the next successful timeline write will reflect
      current state. This keeps the control surface responsive during a
      live event where incident state must not get stuck.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.logging import logger
from app.models.enums import (
    IncidentSeverity,
    IncidentStatus,
    IncidentUpdateType,
    SEVERITY_ORDER,
)
from app.models.nosql.incident_timeline import TimelineUpdate
from app.models.sql.event import Event
from app.models.sql.incident import Incident
from app.models.sql.staff import Staff
from app.repositories import incident_repo, incident_timeline_repo
from app.schemas.incident import (
    IncidentCreate,
    IncidentDetailRead,
    IncidentEscalateRequest,
    IncidentRead,
    IncidentSummary,
    IncidentTimelineRead,
    IncidentUpdate,
    TimelineUpdateCreate,
    TimelineUpdateRead,
)


# ---------------------------------------------------------------------------
# Status transition rules
# ---------------------------------------------------------------------------

_ALLOWED_STATUS_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.ESCALATED, IncidentStatus.RESOLVED, IncidentStatus.CLOSED},
    IncidentStatus.ESCALATED: {IncidentStatus.OPEN, IncidentStatus.RESOLVED, IncidentStatus.CLOSED},
    IncidentStatus.RESOLVED: {IncidentStatus.OPEN, IncidentStatus.CLOSED},
    IncidentStatus.CLOSED: set(),
}

_TERMINAL_STATUSES = {IncidentStatus.CLOSED}
_RESOLUTION_REQUIRED = {IncidentStatus.RESOLVED, IncidentStatus.CLOSED}


def _assert_status_transition(current: IncidentStatus, new: IncidentStatus) -> None:
    if new == current:
        return
    if new not in _ALLOWED_STATUS_TRANSITIONS[current]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot transition incident from {current.value} to {new.value}",
        )


# ---------------------------------------------------------------------------
# Foreign-key validation helpers
# ---------------------------------------------------------------------------

def _assert_event_exists(session: Session, event_id: int) -> None:
    if session.get(Event, event_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")


def _assert_staff_exists(session: Session, staff_id: int, label: str) -> None:
    if session.get(Staff, staff_id) is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"{label} staff member not found"
        )


def _get_incident_or_404(session: Session, incident_id: int) -> Incident:
    inc = incident_repo.get_incident(session, incident_id)
    if inc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    return inc


# ---------------------------------------------------------------------------
# Timeline helpers (best-effort)
# ---------------------------------------------------------------------------

async def _append_timeline(
    incident: Incident, update: TimelineUpdate
) -> None:
    try:
        await incident_timeline_repo.append_update(incident.id, incident.event_id, update)
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(
            "Failed to append timeline for incident %s: %s", incident.id, exc
        )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

async def create_incident(
    session: Session, payload: IncidentCreate
) -> IncidentDetailRead:
    _assert_event_exists(session, payload.event_id)
    _assert_staff_exists(session, payload.reporter_staff_id, "Reporter")
    if payload.assigned_staff_id is not None:
        _assert_staff_exists(session, payload.assigned_staff_id, "Assigned")

    incident = Incident(
        event_id=payload.event_id,
        reporter_staff_id=payload.reporter_staff_id,
        assigned_staff_id=payload.assigned_staff_id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        category=payload.category,
        severity=payload.severity,
        status=IncidentStatus.OPEN,
    )
    incident = incident_repo.save(session, incident)

    await _append_timeline(
        incident,
        TimelineUpdate(
            update_type=IncidentUpdateType.CREATED,
            author_staff_id=payload.reporter_staff_id,
            message=f"Incident reported: {payload.title}",
            severity_change=payload.severity,
            status_change=IncidentStatus.OPEN,
        ),
    )
    if payload.assigned_staff_id is not None:
        await _append_timeline(
            incident,
            TimelineUpdate(
                update_type=IncidentUpdateType.ASSIGNMENT,
                author_staff_id=payload.reporter_staff_id,
                message=f"Assigned to staff {payload.assigned_staff_id}",
            ),
        )

    return await _build_detail(incident)


# ---------------------------------------------------------------------------
# Patch
# ---------------------------------------------------------------------------

async def patch_incident(
    session: Session, incident_id: int, payload: IncidentUpdate
) -> IncidentDetailRead:
    incident = _get_incident_or_404(session, incident_id)

    if incident.status in _TERMINAL_STATUSES and _mutates_state(payload):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Incident is closed and cannot be modified",
        )

    prior_status = incident.status
    prior_severity = incident.severity
    prior_assignee = incident.assigned_staff_id

    # Validate status transition up front (if requested).
    if payload.status is not None and payload.status != incident.status:
        _assert_status_transition(incident.status, payload.status)

    # Enforce resolution summary when closing/resolving.
    if (
        payload.status in _RESOLUTION_REQUIRED
        and not (payload.resolution_summary or incident.resolution_summary)
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"resolution_summary is required to move incident to {payload.status.value}",
        )

    # Validate assignee if provided.
    if payload.assigned_staff_id is not None:
        _assert_staff_exists(session, payload.assigned_staff_id, "Assigned")

    # Apply mutations.
    simple_fields = {
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "category": payload.category,
        "resolution_summary": payload.resolution_summary,
    }
    for field, value in simple_fields.items():
        if value is not None:
            setattr(incident, field, value)

    if payload.severity is not None:
        incident.severity = payload.severity
    if payload.assigned_staff_id is not None:
        incident.assigned_staff_id = payload.assigned_staff_id
    if payload.status is not None:
        incident.status = payload.status
        if payload.status == IncidentStatus.RESOLVED and incident.resolved_at is None:
            incident.resolved_at = datetime.utcnow()

    incident.updated_at = datetime.utcnow()
    incident = incident_repo.save(session, incident)

    # Append timeline entries describing meaningful changes.
    actor = payload.actor_staff_id
    if payload.note:
        await _append_timeline(
            incident,
            TimelineUpdate(
                update_type=IncidentUpdateType.NOTE,
                author_staff_id=actor,
                message=payload.note,
            ),
        )
    if payload.severity is not None and payload.severity != prior_severity:
        await _append_timeline(
            incident,
            TimelineUpdate(
                update_type=IncidentUpdateType.SEVERITY_CHANGE,
                author_staff_id=actor,
                message=f"Severity {prior_severity.value} → {payload.severity.value}",
                severity_change=payload.severity,
            ),
        )
    if (
        payload.assigned_staff_id is not None
        and payload.assigned_staff_id != prior_assignee
    ):
        await _append_timeline(
            incident,
            TimelineUpdate(
                update_type=IncidentUpdateType.ASSIGNMENT,
                author_staff_id=actor,
                message=f"Assignee changed to staff {payload.assigned_staff_id}",
            ),
        )
    if payload.status is not None and payload.status != prior_status:
        update_type = (
            IncidentUpdateType.RESOLUTION
            if payload.status in _RESOLUTION_REQUIRED
            else IncidentUpdateType.STATUS_CHANGE
        )
        await _append_timeline(
            incident,
            TimelineUpdate(
                update_type=update_type,
                author_staff_id=actor,
                message=f"Status {prior_status.value} → {payload.status.value}",
                status_change=payload.status,
            ),
        )

    return await _build_detail(incident)


def _mutates_state(payload: IncidentUpdate) -> bool:
    return any(
        v is not None
        for v in (
            payload.title,
            payload.description,
            payload.location,
            payload.category,
            payload.severity,
            payload.status,
            payload.assigned_staff_id,
            payload.resolution_summary,
        )
    )


# ---------------------------------------------------------------------------
# Add timeline update
# ---------------------------------------------------------------------------

async def add_update(
    session: Session, incident_id: int, payload: TimelineUpdateCreate
) -> IncidentDetailRead:
    incident = _get_incident_or_404(session, incident_id)

    # Optional SQL sync for status / severity embedded in the update.
    sql_dirty = False
    if payload.status_change and payload.status_change != incident.status:
        _assert_status_transition(incident.status, payload.status_change)
        if (
            payload.status_change in _RESOLUTION_REQUIRED
            and not incident.resolution_summary
        ):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "resolution_summary must be set before moving to "
                f"{payload.status_change.value}; use PATCH /incidents/{{id}}",
            )
        incident.status = payload.status_change
        if payload.status_change == IncidentStatus.RESOLVED and not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()
        sql_dirty = True

    if payload.severity_change and payload.severity_change != incident.severity:
        incident.severity = payload.severity_change
        sql_dirty = True

    if sql_dirty:
        incident.updated_at = datetime.utcnow()
        incident = incident_repo.save(session, incident)

    await _append_timeline(
        incident,
        TimelineUpdate(
            update_type=payload.update_type,
            author_staff_id=payload.author_staff_id,
            message=payload.message,
            status_change=payload.status_change,
            severity_change=payload.severity_change,
        ),
    )
    return await _build_detail(incident)


# ---------------------------------------------------------------------------
# Escalate
# ---------------------------------------------------------------------------

async def escalate(
    session: Session, incident_id: int, payload: IncidentEscalateRequest
) -> IncidentDetailRead:
    incident = _get_incident_or_404(session, incident_id)

    if incident.status in _TERMINAL_STATUSES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot escalate a closed incident",
        )

    current_rank = SEVERITY_ORDER[incident.severity.value]
    target = payload.target_severity or _next_severity(incident.severity)
    if target is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Incident is already at maximum severity"
        )
    if SEVERITY_ORDER[target.value] <= current_rank:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Escalation target ({target.value}) must be higher than "
            f"current severity ({incident.severity.value})",
        )

    prior_severity = incident.severity
    incident.severity = target
    # Escalation implies someone is working it.
    if incident.status == IncidentStatus.OPEN:
        incident.status = IncidentStatus.ESCALATED
    incident.updated_at = datetime.utcnow()
    incident = incident_repo.save(session, incident)

    message = (
        payload.note
        or f"Escalated from {prior_severity.value} to {target.value}"
    )
    await _append_timeline(
        incident,
        TimelineUpdate(
            update_type=IncidentUpdateType.ESCALATION,
            author_staff_id=payload.actor_staff_id,
            message=message,
            severity_change=target,
            status_change=incident.status if incident.status == IncidentStatus.ESCALATED else None,
        ),
    )
    return await _build_detail(incident)


def _next_severity(current: IncidentSeverity) -> Optional[IncidentSeverity]:
    ordered = [IncidentSeverity.LOW, IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]
    idx = ordered.index(current)
    return ordered[idx + 1] if idx + 1 < len(ordered) else None


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

async def get_incident_detail(
    session: Session, incident_id: int
) -> IncidentDetailRead:
    incident = _get_incident_or_404(session, incident_id)
    return await _build_detail(incident)


def list_event_incidents(
    session: Session, event_id: int
) -> List[IncidentSummary]:
    _assert_event_exists(session, event_id)
    rows = incident_repo.list_incidents_for_event(session, event_id)
    return [IncidentSummary.model_validate(r) for r in rows]


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

async def _build_detail(incident: Incident) -> IncidentDetailRead:
    timeline_doc = None
    try:
        timeline_doc = await incident_timeline_repo.get_timeline(incident.id)
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to load timeline for incident %s: %s", incident.id, exc)

    timeline_read: Optional[IncidentTimelineRead] = None
    if timeline_doc is not None:
        timeline_read = IncidentTimelineRead(
            incident_id=timeline_doc.incident_id,
            event_id=timeline_doc.event_id,
            updates=[
                TimelineUpdateRead(
                    update_type=u.update_type,
                    author_staff_id=u.author_staff_id,
                    message=u.message,
                    status_change=u.status_change,
                    severity_change=u.severity_change,
                    timestamp=u.timestamp,
                )
                for u in timeline_doc.updates
            ],
            created_at=timeline_doc.created_at,
            updated_at=timeline_doc.updated_at,
        )

    return IncidentDetailRead(
        incident=IncidentRead.model_validate(incident),
        timeline=timeline_read,
    )
