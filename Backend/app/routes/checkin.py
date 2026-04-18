"""Check-in endpoints. Thin HTTP layer."""
from typing import List

from fastapi import APIRouter, Query

from app.core.dependencies import SessionDep
from app.schemas.checkin import (
    CheckInScanRequest,
    CheckInScanResponse,
    EventCheckInSummary,
    ManualCheckInRequest,
    ScanLogRead,
)
from app.services import checkin_service

router = APIRouter(prefix="/checkin", tags=["checkin"])


@router.post("/scan", response_model=CheckInScanResponse)
async def scan_qr(req: CheckInScanRequest, session: SessionDep):
    return await checkin_service.scan_qr(session, req)


@router.post("/manual", response_model=CheckInScanResponse)
async def manual_check_in(req: ManualCheckInRequest, session: SessionDep):
    return await checkin_service.manual_check_in(session, req)


@router.get("/event/{event_id}", response_model=EventCheckInSummary)
async def event_summary(event_id: int, session: SessionDep):
    return await checkin_service.event_summary(session, event_id)


@router.get("/logs/{event_id}", response_model=List[ScanLogRead])
async def list_event_logs(
    event_id: int,
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    return await checkin_service.list_event_logs(event_id, limit=limit, skip=skip)
