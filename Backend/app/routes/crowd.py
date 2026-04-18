"""Crowd ingestion endpoints."""
from typing import List

from fastapi import APIRouter, Query, status

from app.core.dependencies import SessionDep
from app.schemas.crowd import (
    CrowdAlert,
    CrowdEventCreate,
    CrowdEventRead,
    CrowdIngestResponse,
    CrowdThresholdRead,
    CrowdThresholdUpsert,
    EventZoneSnapshot,
)
from app.services import crowd_service

router = APIRouter(prefix="/crowd", tags=["crowd"])


@router.post(
    "/events",
    response_model=CrowdIngestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_reading(payload: CrowdEventCreate, session: SessionDep):
    return await crowd_service.ingest(session, payload)


@router.get("/events/{event_id}", response_model=List[CrowdEventRead])
async def list_event_readings(
    event_id: int,
    session: SessionDep,
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    return await crowd_service.list_event_readings(
        session, event_id, limit=limit, skip=skip
    )


@router.get("/zones/{event_id}", response_model=EventZoneSnapshot)
async def zone_snapshot(event_id: int, session: SessionDep):
    return await crowd_service.zone_snapshot(session, event_id)


@router.get("/alerts/{event_id}", response_model=List[CrowdAlert])
async def list_alerts(
    event_id: int,
    session: SessionDep,
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    return await crowd_service.list_alerts(session, event_id, limit=limit, skip=skip)


@router.post(
    "/thresholds",
    response_model=CrowdThresholdRead,
    status_code=status.HTTP_200_OK,
)
async def upsert_threshold(
    payload: CrowdThresholdUpsert, session: SessionDep
):
    return await crowd_service.upsert_threshold(session, payload)
