"""Reporting endpoints. Thin HTTP layer."""
from fastapi import APIRouter

from app.core.dependencies import SessionDep
from app.schemas.reporting import (
    AttendanceReport,
    OrganizerDashboard,
    PostEventReport,
    RevenueReport,
    SafetyReport,
)
from app.services import reporting_service

router = APIRouter(tags=["reports"])


@router.get(
    "/dashboard/organizer/{event_id}",
    response_model=OrganizerDashboard,
)
async def organizer_dashboard(event_id: int, session: SessionDep):
    return await reporting_service.organizer_dashboard(session, event_id)


@router.get(
    "/reports/attendance/{event_id}",
    response_model=AttendanceReport,
)
async def attendance_report(event_id: int, session: SessionDep):
    return await reporting_service.attendance_report(session, event_id)


@router.get(
    "/reports/revenue/{event_id}",
    response_model=RevenueReport,
)
def revenue_report(event_id: int, session: SessionDep):
    return reporting_service.revenue_report(session, event_id)


@router.get(
    "/reports/safety/{event_id}",
    response_model=SafetyReport,
)
async def safety_report(event_id: int, session: SessionDep):
    return await reporting_service.safety_report(session, event_id)


@router.get(
    "/reports/post-event/{event_id}",
    response_model=PostEventReport,
)
async def post_event_report(event_id: int, session: SessionDep):
    return await reporting_service.post_event_report(session, event_id)
