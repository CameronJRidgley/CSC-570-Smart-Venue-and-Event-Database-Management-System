"""Reporting-specific SQL and Mongo aggregations.

Keeps read-only, report-only queries separate from transactional repos.
"""
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.enums import IncidentCategory, IncidentSeverity, IncidentStatus, TicketStatus
from app.models.nosql.crowd_event import CrowdEvent
from app.models.nosql.incident_timeline import IncidentTimeline
from app.models.sql.incident import Incident
from app.models.sql.ticket import Ticket

ACTIVE_TICKET_STATUSES = (TicketStatus.VALID, TicketStatus.USED)


# ---------------------------------------------------------------------------
# SQL: ticket revenue
# ---------------------------------------------------------------------------

def ticket_revenue_for_event(session: Session, event_id: int) -> Tuple[float, int]:
    """Returns (total_revenue, ticket_count) for non-cancelled tickets."""
    stmt = select(
        func.coalesce(func.sum(Ticket.price), 0.0),
        func.count(Ticket.id),
    ).where(
        Ticket.event_id == event_id,
        Ticket.status.in_(ACTIVE_TICKET_STATUSES),
    )
    revenue, count = session.exec(stmt).one()
    return float(revenue), int(count)


# ---------------------------------------------------------------------------
# SQL: incidents
# ---------------------------------------------------------------------------

def incident_counts_by_severity(
    session: Session, event_id: int
) -> List[Tuple[IncidentSeverity, int]]:
    stmt = (
        select(Incident.severity, func.count(Incident.id))
        .where(Incident.event_id == event_id)
        .group_by(Incident.severity)
    )
    return list(session.exec(stmt).all())


def incident_counts_by_category(
    session: Session, event_id: int
) -> List[Tuple[IncidentCategory, int]]:
    stmt = (
        select(Incident.category, func.count(Incident.id))
        .where(Incident.event_id == event_id)
        .group_by(Incident.category)
    )
    return list(session.exec(stmt).all())


def incident_counts_by_status(
    session: Session, event_id: int
) -> List[Tuple[IncidentStatus, int]]:
    stmt = (
        select(Incident.status, func.count(Incident.id))
        .where(Incident.event_id == event_id)
        .group_by(Incident.status)
    )
    return list(session.exec(stmt).all())


def incident_total_for_event(session: Session, event_id: int) -> int:
    stmt = select(func.count(Incident.id)).where(Incident.event_id == event_id)
    return int(session.exec(stmt).one())


# ---------------------------------------------------------------------------
# Mongo: crowd peak by zone
# ---------------------------------------------------------------------------

async def peak_density_by_zone(event_id: int, top_n: int = 5) -> List[dict]:
    """Return top-N zones by peak people_count, with their latest reading."""
    pipeline = [
        {"$match": {"event_id": event_id}},
        {
            "$group": {
                "_id": "$zone",
                "peak_people_count": {"$max": "$people_count"},
                "latest_recorded_at": {"$max": "$recorded_at"},
            }
        },
        {"$sort": {"peak_people_count": -1}},
        {"$limit": top_n},
    ]
    peaks = await CrowdEvent.get_motor_collection().aggregate(pipeline).to_list(length=None)

    # Attach the latest document's alert_level for each zone (second quick pass).
    enriched: List[dict] = []
    for row in peaks:
        zone = row["_id"]
        latest_doc = await CrowdEvent.find_one(
            CrowdEvent.event_id == event_id, CrowdEvent.zone == zone,
            sort=[("recorded_at", -1)],
        )
        enriched.append({
            "zone": zone,
            "peak_people_count": int(row["peak_people_count"]),
            "latest_alert_level": latest_doc.alert_level if latest_doc else None,
            "latest_recorded_at": row["latest_recorded_at"],
        })
    return enriched


async def crowd_alert_count(event_id: int) -> int:
    return await CrowdEvent.find(
        CrowdEvent.event_id == event_id,
        CrowdEvent.threshold_breached == True,  # noqa: E712
    ).count()


# ---------------------------------------------------------------------------
# Mongo: escalations from incident timelines
# ---------------------------------------------------------------------------

async def escalation_count(event_id: int) -> int:
    pipeline = [
        {"$match": {"event_id": event_id}},
        {"$unwind": "$updates"},
        {"$match": {"updates.update_type": "escalation"}},
        {"$count": "n"},
    ]
    rows = await IncidentTimeline.get_motor_collection().aggregate(pipeline).to_list(length=1)
    return int(rows[0]["n"]) if rows else 0


# ---------------------------------------------------------------------------
# Mongo: check-in trend (hourly buckets)
# ---------------------------------------------------------------------------

async def hourly_checkin_trend(event_id: int) -> List[dict]:
    """Successful scans grouped by hour (UTC)."""
    from app.models.nosql.scan_log import ScanLog

    pipeline = [
        {"$match": {"event_id": event_id, "result": "success"}},
        {
            "$group": {
                "_id": {
                    "$dateTrunc": {"date": "$scanned_at", "unit": "hour"}
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    rows = await ScanLog.get_motor_collection().aggregate(pipeline).to_list(length=None)
    return [{"hour": r["_id"], "count": int(r["count"])} for r in rows]
