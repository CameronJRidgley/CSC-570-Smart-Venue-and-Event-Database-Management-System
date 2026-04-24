"""Reporting aggregation service.

Read-only. Composes data from SQL (tickets, payments, vendor sales,
incidents) and Mongo (scan logs, crowd events, incident timelines) into
organizer-facing report DTOs.
"""
from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.enums import (
    CrowdAlertLevel,
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    TicketStatus,
)
from app.models.sql.event import Event
from app.repositories import (
    crowd_event_repo,
    reporting_repo,
    scan_log_repo,
    ticket_repo,
    vendor_sale_repo,
)
from app.models.enums import ScanResult
from app.schemas.reporting import (
    AttendanceReport,
    CategoryCount,
    HourlyCheckIn,
    OrganizerDashboard,
    PaymentMethodRow,
    PostEventReport,
    RevenueReport,
    SafetyReport,
    SeverityCount,
    VendorRevenueRow,
    ZoneDensity,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_event_exists(session: Session, event_id: int) -> None:
    if session.get(Event, event_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")


def _safe_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

async def attendance_report(
    session: Session, event_id: int
) -> AttendanceReport:
    _assert_event_exists(session, event_id)

    issued = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.VALID)
    used = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.USED)
    sold = issued + used                       # "active" tickets

    approved = await scan_log_repo.count_logs_for_event(event_id, ScanResult.SUCCESS)
    all_logs = await scan_log_repo.count_logs_for_event(event_id)
    denied = max(all_logs - approved, 0)

    trend_rows = await reporting_repo.hourly_checkin_trend(event_id)
    trend = [HourlyCheckIn(hour=r["hour"], count=r["count"]) for r in trend_rows]

    return AttendanceReport(
        event_id=event_id,
        tickets_sold=sold,
        tickets_used=used,
        tickets_unused=issued,
        attendance_rate=_safe_rate(used, sold),
        approved_scans=approved,
        denied_scans=denied,
        checkin_trend=trend,
    )


# ---------------------------------------------------------------------------
# Revenue
# ---------------------------------------------------------------------------

def revenue_report(session: Session, event_id: int) -> RevenueReport:
    _assert_event_exists(session, event_id)

    ticket_rev, ticket_count = reporting_repo.ticket_revenue_for_event(session, event_id)
    vendor_rev, vendor_tx = vendor_sale_repo.event_totals(session, event_id)

    by_vendor_rows = vendor_sale_repo.totals_by_vendor_for_event(session, event_id)
    by_method_rows = vendor_sale_repo.totals_by_payment_method_for_event(session, event_id)

    return RevenueReport(
        event_id=event_id,
        ticket_revenue=round(ticket_rev, 2),
        ticket_count=ticket_count,
        vendor_revenue=round(vendor_rev, 2),
        vendor_transactions=vendor_tx,
        total_revenue=round(ticket_rev + vendor_rev, 2),
        by_vendor=[
            VendorRevenueRow(
                vendor_id=vid, vendor_name=name,
                total_amount=round(float(total), 2),
                transactions=int(cnt),
            )
            for vid, name, total, cnt in by_vendor_rows
        ],
        by_payment_method=[
            PaymentMethodRow(
                payment_method=method,
                total_amount=round(float(total), 2),
                transactions=int(cnt),
            )
            for method, total, cnt in by_method_rows
        ],
    )


# ---------------------------------------------------------------------------
# Safety
# ---------------------------------------------------------------------------

async def safety_report(session: Session, event_id: int) -> SafetyReport:
    _assert_event_exists(session, event_id)

    total = reporting_repo.incident_total_for_event(session, event_id)
    status_rows = reporting_repo.incident_counts_by_status(session, event_id)
    severity_rows = reporting_repo.incident_counts_by_severity(session, event_id)
    category_rows = reporting_repo.incident_counts_by_category(session, event_id)

    status_map = {s: c for s, c in status_rows}
    open_count = (
        status_map.get(IncidentStatus.OPEN, 0)
        + status_map.get(IncidentStatus.ESCALATED, 0)
    )
    resolved_count = (
        status_map.get(IncidentStatus.RESOLVED, 0)
        + status_map.get(IncidentStatus.CLOSED, 0)
    )

    escalations = await reporting_repo.escalation_count(event_id)
    alerts = await reporting_repo.crowd_alert_count(event_id)
    peaks = await reporting_repo.peak_density_by_zone(event_id, top_n=5)

    top_zones: List[ZoneDensity] = []
    for p in peaks:
        top_zones.append(
            ZoneDensity(
                zone=p["zone"],
                peak_people_count=p["peak_people_count"],
                latest_alert_level=p["latest_alert_level"] or CrowdAlertLevel.NORMAL,
                latest_recorded_at=p["latest_recorded_at"],
            )
        )

    return SafetyReport(
        event_id=event_id,
        incidents_total=total,
        incidents_open=open_count,
        incidents_resolved=resolved_count,
        by_severity=[
            SeverityCount(severity=sev, count=int(cnt))
            for sev, cnt in severity_rows
        ],
        by_category=[
            CategoryCount(category=cat, count=int(cnt))
            for cat, cnt in category_rows
        ],
        escalations_count=escalations,
        crowd_alerts_count=alerts,
        top_density_zones=top_zones,
    )


# ---------------------------------------------------------------------------
# Dashboard (compact)
# ---------------------------------------------------------------------------

async def organizer_dashboard(
    session: Session, event_id: int
) -> OrganizerDashboard:
    _assert_event_exists(session, event_id)

    issued = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.VALID)
    used = ticket_repo.count_by_status_for_event(session, event_id, TicketStatus.USED)
    sold = issued + used

    ticket_rev, _ = reporting_repo.ticket_revenue_for_event(session, event_id)
    vendor_rev, _ = vendor_sale_repo.event_totals(session, event_id)

    incidents = reporting_repo.incident_total_for_event(session, event_id)
    alerts = await reporting_repo.crowd_alert_count(event_id)

    return OrganizerDashboard(
        event_id=event_id,
        tickets_sold=sold,
        checked_in=used,
        attendance_rate=_safe_rate(used, sold),
        ticket_revenue=round(ticket_rev, 2),
        vendor_revenue=round(vendor_rev, 2),
        total_revenue=round(ticket_rev + vendor_rev, 2),
        incidents_count=incidents,
        crowd_alerts_count=alerts,
    )


# ---------------------------------------------------------------------------
# Post-event combined
# ---------------------------------------------------------------------------

async def post_event_report(
    session: Session, event_id: int
) -> PostEventReport:
    _assert_event_exists(session, event_id)
    attendance = await attendance_report(session, event_id)
    revenue = revenue_report(session, event_id)
    safety = await safety_report(session, event_id)
    return PostEventReport(
        event_id=event_id,
        generated_at=datetime.utcnow(),
        attendance=attendance,
        revenue=revenue,
        safety=safety,
    )
