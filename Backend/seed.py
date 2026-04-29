"""Seed realistic demo data into Postgres + MongoDB.

Usage (from `backend/`):

    python -m scripts.seed              # idempotent: safe to re-run
    python -m scripts.seed --wipe       # clear target tables/collections first

Creates enough coordinated SQL + Mongo data to drive every portal:

  * 2 venues, 6 seating sections, 3 events
  * 10 attendees, 5 staff, 4 vendors (with event assignments)
  * ~15 tickets (valid / used / cancelled) with paired payments
  * Mongo scan_logs matching the USED tickets
  * 2 incidents (one escalated) with multi-update Mongo timelines
  * Crowd thresholds per zone + a time-series of readings crossing
    normal -> high -> critical so alert endpoints return data
  * Vendor sales across payment methods
  * 3 feedback entries

Idempotency: the script looks for a marker attendee
(`seed_marker@example.com`). If found, it skips SQL seeding and only
tops up Mongo collections.
"""
from __future__ import annotations

import argparse
import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlmodel import Session, SQLModel, delete, select

from app.core.logging import configure_logging, logger
from app.db.mongo import close_mongo, init_mongo
from app.db.sql import engine
from app.models.enums import (
    CrowdAlertLevel,
    CrowdSource,
    EventStatus,
    IncidentCategory,
    IncidentSeverity,
    IncidentStatus,
    IncidentUpdateType,
    PaymentMethod,
    PaymentStatus,
    ScanResult,
    SeatingTier,
    StaffRole,
    TicketStatus,
    UserRole,
)
from app.models.nosql import DOCUMENT_MODELS
from app.models.nosql.crowd_event import CrowdEvent
from app.models.nosql.crowd_threshold import CrowdThreshold
from app.models.nosql.feedback import FeedbackStream
from app.models.nosql.incident_timeline import IncidentTimeline, TimelineUpdate
from app.models.nosql.scan_log import ScanLog
from app.models.sql.attendee import Attendee
from app.models.sql.event import Event
from app.models.sql.incident import Incident
from app.models.sql.payment import Payment
from app.models.sql.staff import Staff, StaffVendorAssignment
from app.models.sql.ticket import Ticket
from app.models.sql.user import User
from app.models.sql.vendor import Vendor, VendorSale
from app.models.sql.vendor_assignment import VendorEventAssignment
from app.models.sql.venue import SeatingSection, Venue

# A marker row we use to detect "already seeded".
MARKER_EMAIL = "seed_marker@example.com"


# ---------------------------------------------------------------------------
# SQL seeding
# ---------------------------------------------------------------------------

def _already_seeded(session: Session) -> bool:
    stmt = select(Attendee).where(Attendee.email == MARKER_EMAIL)
    return session.exec(stmt).first() is not None


def _wipe_sql(session: Session) -> None:
    """Clear everything the seed script writes (best-effort, FK-safe order)."""
    for model in (
        VendorSale,
        StaffVendorAssignment,
        VendorEventAssignment,
        Payment,
        Ticket,
        Incident,
        User,
        Attendee,
        Staff,
        Vendor,
        SeatingSection,
        Event,
        Venue,
    ):
        session.exec(delete(model))
    session.commit()
    logger.info("SQL tables cleared")


def seed_sql(session: Session) -> dict[str, list]:
    """Populate SQL tables. Returns a dict of created rows keyed by kind
    so the Mongo seeder can reference ids.
    """
    now = datetime.utcnow()

    # --- Venues --------------------------------------------------------
    venues = [
        Venue(
            name="Hampton Coliseum",
            address="1610 Coliseum Dr",
            city="Hampton",
            total_capacity=5000,
        ),
        Venue(
            name="Student Union Amphitheater",
            address="100 E Queen St",
            city="Hampton",
            total_capacity=1200,
        ),
    ]
    session.add_all(venues)
    session.commit()
    for v in venues:
        session.refresh(v)

    # --- Seating sections (per venue) ----------------------------------
    sections = [
        SeatingSection(venue_id=venues[0].id, name="Floor",   tier=SeatingTier.GENERAL, capacity=2000, base_price=45.00),
        SeatingSection(venue_id=venues[0].id, name="Lower",   tier=SeatingTier.PREMIUM, capacity=1800, base_price=75.00),
        SeatingSection(venue_id=venues[0].id, name="VIP Box", tier=SeatingTier.VIP,     capacity=200,  base_price=150.00),
        SeatingSection(venue_id=venues[1].id, name="Lawn",    tier=SeatingTier.GENERAL, capacity=800,  base_price=25.00),
        SeatingSection(venue_id=venues[1].id, name="Reserved",tier=SeatingTier.PREMIUM, capacity=350,  base_price=55.00),
        SeatingSection(venue_id=venues[1].id, name="Stage Pit",tier=SeatingTier.VIP,    capacity=50,   base_price=95.00),
    ]
    session.add_all(sections)
    session.commit()
    for s in sections:
        session.refresh(s)

    # --- Events --------------------------------------------------------
    events = [
        Event(
            name="Spring Fest 2026",
            description="Annual spring music festival",
            venue_id=venues[0].id,
            starts_at=now + timedelta(days=7, hours=18),
            ends_at=now + timedelta(days=7, hours=22),
            status=EventStatus.PUBLISHED,
            capacity=4000,
        ),
        Event(
            name="HU Homecoming Concert",
            description="Homecoming weekend headliner",
            venue_id=venues[0].id,
            starts_at=now + timedelta(days=21, hours=19),
            ends_at=now + timedelta(days=21, hours=23),
            status=EventStatus.PUBLISHED,
            capacity=4500,
        ),
        Event(
            name="Indie Showcase",
            description="Student-run showcase",
            venue_id=venues[1].id,
            starts_at=now + timedelta(days=3, hours=18),
            ends_at=now + timedelta(days=3, hours=22),
            status=EventStatus.ONGOING,         # so the crowd/incident data feels live
            capacity=1000,
        ),
    ]
    session.add_all(events)
    session.commit()
    for e in events:
        session.refresh(e)

    # --- Attendees (including the marker row) --------------------------
    first_names = ["Alice", "Bob", "Carla", "Derek", "Eve", "Frank", "Gina", "Henry", "Ivy", "Jon"]
    last_names = ["Nguyen", "Patel", "Johnson", "Smith", "Garcia", "Kim", "Okafor", "Lee", "Martinez", "Chen"]
    attendees: list[Attendee] = []
    for i, (first, last) in enumerate(zip(first_names, last_names)):
        attendees.append(
            Attendee(
                full_name=f"{first} {last}",
                email=f"{first.lower()}.{last.lower()}@example.com",
                phone=f"555-01{i:02d}",
            )
        )
    attendees.append(
        Attendee(full_name="Seed Marker", email=MARKER_EMAIL, phone="555-0000")
    )
    session.add_all(attendees)
    session.commit()
    for a in attendees:
        session.refresh(a)

    # --- Staff ---------------------------------------------------------
    staff = [
        Staff(full_name="Morgan Reed",   email="morgan.reed@hu.edu",   phone="555-0200", role=StaffRole.MANAGER),
        Staff(full_name="Sam Ortiz",     email="sam.ortiz@hu.edu",     phone="555-0201", role=StaffRole.SECURITY),
        Staff(full_name="Dr. Liu",       email="liu@hu.edu",           phone="555-0202", role=StaffRole.MEDICAL),
        Staff(full_name="Jasmine Ward",  email="jasmine.ward@hu.edu",  phone="555-0203", role=StaffRole.USHER),
        Staff(full_name="Tony Alvarez",  email="tony.alvarez@hu.edu",  phone="555-0204", role=StaffRole.VENDOR_LIAISON),
    ]
    session.add_all(staff)
    session.commit()
    for s in staff:
        session.refresh(s)

    # --- Vendors + event assignments -----------------------------------
    vendors = [
        Vendor(name="Mama J's Kitchen",  category="food",  contact_email="mama@example.com", booth_number="F-01"),
        Vendor(name="Blue Bean Coffee",  category="drink", contact_email="blue@example.com", booth_number="D-02"),
        Vendor(name="Tide Merch Co.",    category="merch", contact_email="tide@example.com", booth_number="M-01"),
        Vendor(name="Campus Print Shop", category="merch", contact_email="print@example.com",booth_number="M-02"),
    ]
    session.add_all(vendors)
    session.commit()
    for v in vendors:
        session.refresh(v)

    assignments = [
        VendorEventAssignment(vendor_id=vendors[0].id, event_id=events[0].id, booth_number="F-01"),
        VendorEventAssignment(vendor_id=vendors[1].id, event_id=events[0].id, booth_number="D-02"),
        VendorEventAssignment(vendor_id=vendors[2].id, event_id=events[0].id, booth_number="M-01"),
        VendorEventAssignment(vendor_id=vendors[0].id, event_id=events[2].id, booth_number="F-01"),
        VendorEventAssignment(vendor_id=vendors[3].id, event_id=events[2].id, booth_number="M-02"),
    ]
    session.add_all(assignments)

    staff_vendor = [
        StaffVendorAssignment(staff_id=staff[4].id, vendor_id=vendors[0].id, event_id=events[0].id),
        StaffVendorAssignment(staff_id=staff[4].id, vendor_id=vendors[1].id, event_id=events[0].id),
        StaffVendorAssignment(staff_id=staff[4].id, vendor_id=vendors[2].id, event_id=events[0].id),
    ]
    session.add_all(staff_vendor)
    session.commit()

    # --- Tickets + payments --------------------------------------------
    # Spread tickets across the two published events; mark some as USED
    # so check-in metrics aren't empty.
    tickets: list[Ticket] = []
    payments: list[Payment] = []

    def _add_ticket(event: Event, section: SeatingSection, attendee: Attendee,
                    seat: str, status: TicketStatus,
                    method: PaymentMethod = PaymentMethod.CARD) -> Ticket:
        qr = f"TKT-{secrets.token_hex(6)}"
        ticket = Ticket(
            event_id=event.id,
            seating_section_id=section.id,
            attendee_id=attendee.id,
            seat_number=seat,
            qr_code=qr,
            price=section.base_price,
            status=status,
            used_at=(now if status == TicketStatus.USED else None),
        )
        session.add(ticket)
        session.flush()                              # populate ticket.id
        payment = Payment(
            ticket_id=ticket.id,
            attendee_id=attendee.id,
            amount=section.base_price,
            method=method,
            status=PaymentStatus.COMPLETED,
            transaction_ref=f"TXN-{secrets.token_hex(4)}",
        )
        session.add(payment)
        tickets.append(ticket)
        payments.append(payment)
        return ticket

    # Event 0 — Spring Fest: mix of valid + used tickets
    _add_ticket(events[0], sections[0], attendees[0], "A12", TicketStatus.USED)
    _add_ticket(events[0], sections[0], attendees[1], "A13", TicketStatus.USED)
    _add_ticket(events[0], sections[0], attendees[2], "A14", TicketStatus.VALID)
    _add_ticket(events[0], sections[1], attendees[3], "L05", TicketStatus.USED, PaymentMethod.ONLINE)
    _add_ticket(events[0], sections[1], attendees[4], "L06", TicketStatus.VALID, PaymentMethod.ONLINE)
    _add_ticket(events[0], sections[2], attendees[5], "V01", TicketStatus.VALID, PaymentMethod.CARD)
    _add_ticket(events[0], sections[2], attendees[6], "V02", TicketStatus.CANCELLED)

    # Event 1 — Homecoming: all valid (future event)
    _add_ticket(events[1], sections[0], attendees[7], "A22", TicketStatus.VALID)
    _add_ticket(events[1], sections[1], attendees[8], "L11", TicketStatus.VALID, PaymentMethod.ONLINE)
    _add_ticket(events[1], sections[2], attendees[9], "V03", TicketStatus.VALID)

    # Event 2 — Indie Showcase (ONGOING): ongoing check-ins
    _add_ticket(events[2], sections[3], attendees[0], "LW-01", TicketStatus.USED, PaymentMethod.CASH)
    _add_ticket(events[2], sections[3], attendees[1], "LW-02", TicketStatus.USED)
    _add_ticket(events[2], sections[4], attendees[2], "R-04",  TicketStatus.USED, PaymentMethod.CARD)
    _add_ticket(events[2], sections[4], attendees[3], "R-05",  TicketStatus.VALID)
    _add_ticket(events[2], sections[5], attendees[4], "P-01",  TicketStatus.USED, PaymentMethod.CARD)

    session.commit()
    for t in tickets:
        session.refresh(t)
    for p in payments:
        session.refresh(p)

    # --- Incidents (SQL side; timelines written in Mongo phase) --------
    incidents = [
        Incident(
            event_id=events[2].id,
            reporter_staff_id=staff[1].id,
            assigned_staff_id=staff[2].id,
            title="Attendee fainted near Section A",
            description="Female attendee ~30yo, responsive. Escorted to medical tent.",
            location="Section A, Row 5",
            category=IncidentCategory.MEDICAL,
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.RESOLVED,
            resolution_summary="Attendee stable. Released to friend. No transport needed.",
            resolved_at=now + timedelta(minutes=25),
        ),
        Incident(
            event_id=events[2].id,
            reporter_staff_id=staff[1].id,
            title="Overcrowding reported at merch booth M-01",
            description="Line spilling into main aisle, blocking fire egress.",
            location="Concourse near M-01",
            category=IncidentCategory.CROWD,
            severity=IncidentSeverity.MEDIUM,
            status=IncidentStatus.ESCALATED,
        ),
    ]
    session.add_all(incidents)
    session.commit()
    for i in incidents:
        session.refresh(i)

    # --- Auth: one of each role ----------------------------------------
    from app.core.security import hash_password
    users = [
        User(email="organizer@example.com", hashed_password=hash_password("organizer123!"),
             full_name="Olivia Organizer", role=UserRole.ORGANIZER),
        User(email="staff@example.com",     hashed_password=hash_password("staff123!"),
             full_name="Sam Staff",         role=UserRole.STAFF),
        User(email="attendee@example.com",  hashed_password=hash_password("attendee123!"),
             full_name="Ava Attendee",      role=UserRole.ATTENDEE),
        User(email="admin@example.com",     hashed_password=hash_password("admin1234!"),
             full_name="Ada Admin",         role=UserRole.ADMIN),
    ]
    session.add_all(users)
    session.commit()

    # --- Vendor sales --------------------------------------------------
    vendor_sales = [
        VendorSale(vendor_id=vendors[0].id, event_id=events[0].id,
                   item_description="Festival Plate", item_category="food",
                   quantity=3, unit_price=12.00, total_amount=36.00,
                   payment_method=PaymentMethod.CARD),
        VendorSale(vendor_id=vendors[0].id, event_id=events[0].id,
                   item_description="Soda", item_category="drink",
                   quantity=5, unit_price=4.00, total_amount=20.00,
                   payment_method=PaymentMethod.CASH),
        VendorSale(vendor_id=vendors[1].id, event_id=events[0].id,
                   item_description="Iced coffee", item_category="drink",
                   quantity=10, unit_price=5.50, total_amount=55.00,
                   payment_method=PaymentMethod.CARD),
        VendorSale(vendor_id=vendors[2].id, event_id=events[0].id,
                   item_description="Event T-shirt (L)", item_category="merch",
                   quantity=2, unit_price=25.00, total_amount=50.00,
                   payment_method=PaymentMethod.CARD),
        VendorSale(vendor_id=vendors[3].id, event_id=events[2].id,
                   item_description="Poster", item_category="merch",
                   quantity=4, unit_price=8.00, total_amount=32.00,
                   payment_method=PaymentMethod.CARD),
    ]
    session.add_all(vendor_sales)
    session.commit()

    return {
        "venues": venues,
        "sections": sections,
        "events": events,
        "attendees": attendees,
        "staff": staff,
        "vendors": vendors,
        "tickets": tickets,
        "incidents": incidents,
    }


# ---------------------------------------------------------------------------
# Mongo seeding
# ---------------------------------------------------------------------------

async def _wipe_mongo() -> None:
    for model in DOCUMENT_MODELS:
        await model.delete_all()
    logger.info("Mongo collections cleared")


async def seed_mongo(sql_ctx: dict[str, list]) -> None:
    events = sql_ctx["events"]
    tickets = sql_ctx["tickets"]
    staff = sql_ctx["staff"]
    incidents = sql_ctx["incidents"]
    attendees = sql_ctx["attendees"]

    now = datetime.utcnow()

    # --- Scan logs: one per USED ticket + a few denied attempts --------
    scan_docs: list[ScanLog] = []
    for t in tickets:
        if t.status == TicketStatus.USED:
            scan_docs.append(
                ScanLog(
                    ticket_id=t.id,
                    event_id=t.event_id,
                    attendee_id=t.attendee_id,
                    gate="North Entrance",
                    staff_id=staff[1].id,
                    qr_code=t.qr_code,
                    result=ScanResult.SUCCESS,
                    reason="OK",
                    scanned_at=now - timedelta(minutes=30),
                )
            )
    # A handful of denied scans for realism
    scan_docs.extend([
        ScanLog(
            event_id=events[2].id, gate="South Entrance",
            staff_id=staff[3].id, qr_code="TKT-deadbeef",
            result=ScanResult.INVALID, reason="QR not found",
            scanned_at=now - timedelta(minutes=20),
        ),
        ScanLog(
            ticket_id=tickets[0].id, event_id=events[2].id, gate="North Entrance",
            staff_id=staff[1].id, qr_code=tickets[0].qr_code,
            result=ScanResult.ALREADY_USED, reason="Ticket already used",
            scanned_at=now - timedelta(minutes=5),
        ),
    ])
    if scan_docs:
        await ScanLog.insert_many(scan_docs)

    # --- Crowd thresholds + readings -----------------------------------
    zones = ["Section A", "Section B", "Section H"]
    thresholds = [
        CrowdThreshold(event_id=events[2].id, zone=z,
                       elevated_at=150, high_at=300, critical_at=450)
        for z in zones
    ]
    await CrowdThreshold.insert_many(thresholds)

    # Time-series: steady climb from normal -> critical in one zone
    readings: list[CrowdEvent] = []
    climb = [80, 140, 200, 260, 320, 380, 440, 470]
    for i, count in enumerate(climb):
        level = (
            CrowdAlertLevel.CRITICAL if count >= 450
            else CrowdAlertLevel.HIGH if count >= 300
            else CrowdAlertLevel.ELEVATED if count >= 150
            else CrowdAlertLevel.NORMAL
        )
        readings.append(
            CrowdEvent(
                event_id=events[2].id,
                zone="Section H",
                people_count=count,
                density=count / 100.0,
                alert_level=level,
                source=CrowdSource.SENSOR,
                sensor_id="cam-H-01",
                threshold_breached=level != CrowdAlertLevel.NORMAL,
                recorded_at=now - timedelta(minutes=(len(climb) - i) * 3),
            )
        )
    # A few normal readings in other zones
    for z in ("Section A", "Section B"):
        readings.append(
            CrowdEvent(
                event_id=events[2].id, zone=z, people_count=95,
                density=0.95, alert_level=CrowdAlertLevel.NORMAL,
                source=CrowdSource.MANUAL,
                recorded_at=now - timedelta(minutes=4),
            )
        )
    await CrowdEvent.insert_many(readings)

    # --- Incident timelines --------------------------------------------
    timelines = [
        IncidentTimeline(
            incident_id=incidents[0].id,
            event_id=incidents[0].event_id,
            updates=[
                TimelineUpdate(
                    update_type=IncidentUpdateType.CREATED,
                    author_staff_id=staff[1].id,
                    message="Incident reported by usher",
                    timestamp=now - timedelta(minutes=30),
                ),
                TimelineUpdate(
                    update_type=IncidentUpdateType.ASSIGNMENT,
                    author_staff_id=staff[0].id,
                    message="Assigned to medical (Dr. Liu)",
                    timestamp=now - timedelta(minutes=28),
                ),
                TimelineUpdate(
                    update_type=IncidentUpdateType.NOTE,
                    author_staff_id=staff[2].id,
                    message="Patient responsive, vitals stable",
                    timestamp=now - timedelta(minutes=20),
                ),
                TimelineUpdate(
                    update_type=IncidentUpdateType.RESOLUTION,
                    author_staff_id=staff[2].id,
                    message="Released to friend, no transport",
                    timestamp=now - timedelta(minutes=5),
                    status_change=IncidentStatus.RESOLVED,
                ),
            ],
        ),
        IncidentTimeline(
            incident_id=incidents[1].id,
            event_id=incidents[1].event_id,
            updates=[
                TimelineUpdate(
                    update_type=IncidentUpdateType.CREATED,
                    author_staff_id=staff[1].id,
                    message="Crowd blocking aisle at M-01",
                    timestamp=now - timedelta(minutes=15),
                ),
                TimelineUpdate(
                    update_type=IncidentUpdateType.ESCALATION,
                    author_staff_id=staff[0].id,
                    message="Escalated: fire egress partially blocked",
                    timestamp=now - timedelta(minutes=10),
                    severity_change=IncidentSeverity.HIGH,
                    status_change=IncidentStatus.ESCALATED,
                ),
            ],
        ),
    ]
    await IncidentTimeline.insert_many(timelines)

    # --- Feedback ------------------------------------------------------
    feedback = [
        FeedbackStream(
            event_id=events[0].id, attendee_id=attendees[0].id,
            rating=5, comments="Best festival I've been to!",
            tags=["sound", "lineup"],
        ),
        FeedbackStream(
            event_id=events[0].id, attendee_id=attendees[1].id,
            rating=4, comments="Loved the event; lines were long at merch.",
            tags=["merch", "wait-time"],
        ),
        FeedbackStream(
            event_id=events[2].id, attendee_id=attendees[2].id,
            rating=3, comments="Overcrowding near Section H worried me.",
            tags=["safety", "crowd"],
        ),
    ]
    await FeedbackStream.insert_many(feedback)

    logger.info(
        "Mongo seeded: %d scans, %d readings, %d timelines, %d feedback",
        len(scan_docs), len(readings), len(timelines), len(feedback),
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def run(wipe: bool) -> None:
    configure_logging()

    # Ensure tables exist (handy when Alembic hasn't been run yet).
    SQLModel.metadata.create_all(engine)
    await init_mongo(document_models=DOCUMENT_MODELS)

    with Session(engine) as session:
        if wipe:
            _wipe_sql(session)
            await _wipe_mongo()

        if _already_seeded(session):
            logger.info("SQL already seeded (marker row present); skipping SQL phase")
            # Re-seeding Mongo on top of existing SQL is unsafe because
            # ids won't match, so bail out cleanly.
            return

        ctx = seed_sql(session)
        logger.info(
            "SQL seeded: %d venues, %d events, %d attendees, %d tickets, %d incidents",
            len(ctx["venues"]), len(ctx["events"]), len(ctx["attendees"]),
            len(ctx["tickets"]), len(ctx["incidents"]),
        )

        await seed_mongo(ctx)

    await close_mongo()
    logger.info("Seed complete")


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Seed demo data for the backend.")
    p.add_argument("--wipe", action="store_true",
                   help="Clear existing rows/collections before seeding.")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    asyncio.run(run(wipe=args.wipe))
