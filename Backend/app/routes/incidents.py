"""Incident reporting and timeline endpoints.

Powers the **Staff Portal**:
  - Incident Reporting Form  → POST  /api/incidents
  - Incident detail view     → GET   /api/incidents/{id}
  - Status / resolution edit → PATCH /api/incidents/{id}
  - Add timeline note        → POST  /api/incidents/{id}/updates
  - Escalate severity        → POST  /api/incidents/{id}/escalate

Also consumed by the **Organizer Dashboard** via:
  - List for an event        → GET   /api/events/{event_id}/incidents

The authoritative record lives in Postgres (`incidents`); the evolving
update history lives in a Mongo `incidents` timeline document keyed by
incident_id. Timeline writes are best-effort — a Mongo blip never
blocks an operator from advancing status in SQL.
"""
from typing import List

from fastapi import APIRouter, status

from app.core.dependencies import SessionDep
from app.schemas.incident import (
    IncidentCreate,
    IncidentDetailRead,
    IncidentEscalateRequest,
    IncidentSummary,
    IncidentUpdate,
    TimelineUpdateCreate,
)
from app.services import incident_service

# Mounted at /api — routes carry their own prefixes so we can expose
# both /incidents/... and /events/{id}/incidents from one module.
router = APIRouter(tags=["incidents"])


@router.post(
    "/incidents",
    response_model=IncidentDetailRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_incident(payload: IncidentCreate, session: SessionDep):
    return await incident_service.create_incident(session, payload)


@router.get("/incidents/{incident_id}", response_model=IncidentDetailRead)
async def get_incident(incident_id: int, session: SessionDep):
    return await incident_service.get_incident_detail(session, incident_id)


@router.patch("/incidents/{incident_id}", response_model=IncidentDetailRead)
async def patch_incident(
    incident_id: int, payload: IncidentUpdate, session: SessionDep
):
    return await incident_service.patch_incident(session, incident_id, payload)


@router.post(
    "/incidents/{incident_id}/updates",
    response_model=IncidentDetailRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_incident_update(
    incident_id: int, payload: TimelineUpdateCreate, session: SessionDep
):
    return await incident_service.add_update(session, incident_id, payload)


@router.post("/incidents/{incident_id}/escalate", response_model=IncidentDetailRead)
async def escalate_incident(
    incident_id: int, payload: IncidentEscalateRequest, session: SessionDep
):
    return await incident_service.escalate(session, incident_id, payload)


@router.get(
    "/events/{event_id}/incidents",
    response_model=List[IncidentSummary],
)
def list_event_incidents(event_id: int, session: SessionDep):
    return incident_service.list_event_incidents(session, event_id)
