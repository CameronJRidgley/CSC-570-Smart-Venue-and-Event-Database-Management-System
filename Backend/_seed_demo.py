"""Idempotent seed script: demo users + venues + events for the portal flows."""
import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.db.sql import engine
from app.db.mongo import init_mongo, close_mongo
from app.models.nosql import DOCUMENT_MODELS
from app.models.sql.user import User
from app.models.sql.venue import Venue, Seat
from app.models.sql.event import Event
from app.models.sql.attendee import Attendee
from app.models.sql.ticket import Ticket
from app.models.sql.payment import Payment
from app.models.nosql.scan_log import ScanLog
from app.models.nosql.crowd_event import CrowdEvent
from app.models.enums import (
    UserRole, SeatingTier, EventStatus, TicketStatus,
    PaymentStatus, PaymentMethod, ScanResult,
    CrowdAlertLevel, CrowdSource,
)
from app.core.security import hash_password

DEMO_USERS = [
    # email,                      password,         role,                full_name,           joined
    ("attendee@example.com",      "attendee123!",   UserRole.ATTENDEE,   "Demo Attendee",     "2025-01-12"),
    ("organizer@example.com",     "organizer123!",  UserRole.ORGANIZER,  "Demo Organizer",    "2025-01-08"),
    ("staff@example.com",         "staff123!",      UserRole.STAFF,      "Demo Staff",        "2025-02-01"),
    ("admin@example.com",         "admin123!",      UserRole.ADMIN,      "Demo Admin",        "2024-12-15"),
    ("security@example.com",      "security123!",   UserRole.STAFF,      "Demo Security",     "2025-02-10"),
    ("vendor@example.com",        "vendor123!",     UserRole.VENDOR,     "Demo Vendor",       "2025-01-20"),
    ("jane.doe@gmail.com",        "password123!",   UserRole.ATTENDEE,   "Jane Doe",          "2025-03-22"),
    ("bob.smith@yahoo.com",       "password123!",   UserRole.ATTENDEE,   "Bob Smith",         "2025-02-14"),
    ("carol.jones@mail.com",      "password123!",   UserRole.ORGANIZER,  "Carol Jones",       "2025-01-30"),
    ("mark.lee@gmail.com",        "password123!",   UserRole.ATTENDEE,   "Mark Lee",          "2025-04-02"),
    ("sara.kim@gmail.com",        "password123!",   UserRole.ATTENDEE,   "Sara Kim",          "2025-04-09"),
    ("tony.garcia@yahoo.com",     "password123!",   UserRole.ATTENDEE,   "Tony Garcia",       "2025-03-15"),
    ("food.truck.fiesta@biz.com", "vendor123!",     UserRole.VENDOR,     "Food Truck Fiesta", "2025-02-25"),
    ("craft.merch@biz.com",       "vendor123!",     UserRole.VENDOR,     "Craft Merch Co.",   "2025-03-05"),
    ("officer.diaz@staff.example.com", "staff123!", UserRole.STAFF,      "Officer Diaz",      "2025-04-12"),
    ("officer.brown@staff.example.com","staff123!", UserRole.STAFF,      "Officer Brown",     "2025-04-18"),
]

DEMO_VENUES = [
    # name,                     address,           city,            cap
    ("Riverside Park",          "123 River Rd",    "Austin",        5000),
    ("Convention Center",       "500 Main St",     "Dallas",        2000),
    ("Downtown Plaza",          "1 Plaza Way",     "Houston",       1500),
    ("Hampton Coliseum",        "1610 Coliseum Dr","Hampton",       8000),
    ("Student Union Amphitheater","100 E Queen St","Hampton",       1200),
    ("Norfolk Waterfront",      "22 Wharf Ln",     "Norfolk",       3000),
]

# Seat tiers per venue keyed by venue name. Each tier creates one Seat row.
# (tier_name, SeatingTier, capacity, base_price)
DEMO_SEAT_TIERS = {
    "Riverside Park":             [("Lawn",     SeatingTier.GENERAL, 3000, 25.00), ("Reserved", SeatingTier.PREMIUM, 1700, 55.00), ("VIP Pit", SeatingTier.VIP, 300, 120.00)],
    "Convention Center":          [("Floor",    SeatingTier.GENERAL, 1400, 75.00), ("Balcony",  SeatingTier.PREMIUM, 500,  110.00), ("VIP Suite", SeatingTier.VIP, 100, 250.00)],
    "Downtown Plaza":             [("Standing", SeatingTier.GENERAL, 1200, 15.00), ("Reserved", SeatingTier.PREMIUM, 300,  35.00)],
    "Hampton Coliseum":           [("Floor",    SeatingTier.GENERAL, 4000, 45.00), ("Lower",    SeatingTier.PREMIUM, 3700, 85.00), ("VIP Box", SeatingTier.VIP, 300, 175.00)],
    "Student Union Amphitheater": [("Lawn",     SeatingTier.GENERAL, 800,  20.00), ("Reserved", SeatingTier.PREMIUM, 350,  45.00), ("Stage Pit", SeatingTier.VIP, 50, 95.00)],
    "Norfolk Waterfront":         [("GA",       SeatingTier.GENERAL, 2500, 30.00), ("VIP Deck", SeatingTier.VIP,     500,  140.00)],
}

# Events tied to seeded venues. Each gets its own ticket_price so the
# attendee browser shows varied pricing instead of a flat $25.
DEMO_EVENTS = [
    # (name,                       venue_name,                  days_from_now, hours, capacity, price, status)
    ("Spring Fest 2026",           "Hampton Coliseum",          7,   4, 4000, 65.00,  EventStatus.PUBLISHED),
    ("Tech Innovators Conference", "Convention Center",         21,  8, 1500, 149.00, EventStatus.PUBLISHED),
    ("Local Food Truck Fiesta",    "Downtown Plaza",            14,  9, 1500, 15.00,  EventStatus.PUBLISHED),
    ("Summer Music Festival",      "Riverside Park",            45,  7, 5000, 89.00,  EventStatus.PUBLISHED),
    ("Jazz Under the Stars",       "Norfolk Waterfront",        30,  4, 2500, 55.00,  EventStatus.PUBLISHED),
    ("Indie Showcase",             "Student Union Amphitheater", 3,  4, 1000, 18.00,  EventStatus.PUBLISHED),
    ("HU Homecoming Concert",      "Hampton Coliseum",          60,  5, 6000, 125.00, EventStatus.DRAFT),
    # A small, sold-out event to demo the "Sold Out" UI state.
    ("Sunset Rooftop Mixer",       "Downtown Plaza",             5,  3,   50,  40.00, EventStatus.PUBLISHED),
]


def seed():
    now = datetime.utcnow()
    with Session(engine) as s:
        # Users
        added_users = 0
        for email, pwd, role, name, joined in DEMO_USERS:
            existing = s.exec(select(User).where(User.email == email)).first()
            if existing:
                continue
            s.add(User(
                email=email,
                hashed_password=hash_password(pwd),
                full_name=name,
                role=role,
                created_at=datetime.fromisoformat(joined),
            ))
            added_users += 1

        # Venues
        added_venues = 0
        for name, addr, city, cap in DEMO_VENUES:
            existing = s.exec(select(Venue).where(Venue.name == name)).first()
            if existing:
                continue
            s.add(Venue(name=name, address=addr, city=city, total_capacity=cap))
            added_venues += 1

        s.commit()

        # Seats: ensure each venue has its full tier set.
        added_seats = 0
        for v in s.exec(select(Venue)).all():
            tiers = DEMO_SEAT_TIERS.get(v.name)
            if not tiers:
                # Fallback for any venue not in our tier map
                tiers = [("General Admission", SeatingTier.GENERAL, v.total_capacity, 25.0)]
            for tier_name, tier_enum, cap, price in tiers:
                existing = s.exec(
                    select(Seat).where(Seat.venue_id == v.id, Seat.name == tier_name)
                ).first()
                if existing:
                    continue
                s.add(Seat(
                    venue_id=v.id,
                    name=tier_name,
                    tier=tier_enum,
                    capacity=cap,
                    base_price=price,
                ))
                added_seats += 1
        s.commit()

        # Events: skip ones already inserted (matched by name).
        added_events = 0
        venues_by_name = {v.name: v for v in s.exec(select(Venue)).all()}
        for name, venue_name, days, hours, cap, price, status in DEMO_EVENTS:
            if s.exec(select(Event).where(Event.name == name)).first():
                continue
            v = venues_by_name.get(venue_name)
            if not v:
                continue
            start = now + timedelta(days=days, hours=18)
            s.add(Event(
                name=name,
                description=f"{name} at {venue_name}",
                venue_id=v.id,
                starts_at=start,
                ends_at=start + timedelta(hours=hours),
                status=status,
                capacity=cap,
                ticket_price=price,
            ))
            added_events += 1
        s.commit()

        # ---------------------------------------------------------------
        # Attendees + Tickets + Payments
        # Only seeds when an event currently has zero tickets, so re-running
        # the script doesn't duplicate sales.
        # ---------------------------------------------------------------
        # Make sure the demo attendees exist (separate from the User table).
        demo_attendees = [
            ("Jane",  "Doe",     "jane.doe@gmail.com",     "5550101"),
            ("Bob",   "Smith",   "bob.smith@yahoo.com",    "5550102"),
            ("Carol", "Jones",   "carol.jones@mail.com",   "5550103"),
            ("Mark",  "Lee",     "mark.lee@gmail.com",     "5550104"),
            ("Sara",  "Kim",     "sara.kim@gmail.com",     "5550105"),
            ("Tony",  "Garcia",  "tony.garcia@yahoo.com",  "5550106"),
            ("Alice", "Nguyen",  "alice.nguyen@mail.com",  "5550107"),
            ("Derek", "Patel",   "derek.patel@mail.com",   "5550108"),
        ]
        added_attendees = 0
        for first, last, email, phone in demo_attendees:
            if s.exec(select(Attendee).where(Attendee.email == email)).first():
                continue
            s.add(Attendee(full_name=f"{first} {last}", email=email, phone=phone))
            added_attendees += 1
        s.commit()

        attendees = list(s.exec(select(Attendee)).all())
        # Reasonable target sales for each event so cards aren't all "0 going".
        # event_name -> (count, [statuses cycle]). Keeps active counts bounded.
        SALES_PLAN = {
            "Spring Fest 2026":           18,
            "Tech Innovators Conference": 12,
            "Local Food Truck Fiesta":     7,
            "Summer Music Festival":      25,
            "Jazz Under the Stars":       10,
            "Indie Showcase":              6,
            "March of Dimes":              4,
            # Fully sold out — capacity == sold.
            "Sunset Rooftop Mixer":       50,
        }
        rng = random.Random(42)
        added_tickets = 0
        for ev in s.exec(select(Event)).all():
            target = SALES_PLAN.get(ev.name)
            if not target:
                continue
            existing = s.exec(select(Ticket).where(Ticket.event_id == ev.id)).first()
            if existing:
                continue
            seats = list(s.exec(select(Seat).where(Seat.venue_id == ev.venue_id)).all())
            if not seats:
                continue
            unit_price = float(ev.ticket_price) if ev.ticket_price is not None else float(seats[0].base_price)
            for i in range(target):
                seat = seats[i % len(seats)]
                attendee = attendees[i % len(attendees)]
                # Sold-out events keep every ticket VALID so spots_left == 0.
                # Other events get a realistic mix: ~70% valid, ~20% used,
                # ~10% cancelled.
                if ev.name == "Sunset Rooftop Mixer":
                    t_status = TicketStatus.VALID
                else:
                    roll = rng.random()
                    t_status = (TicketStatus.USED if roll < 0.2
                                else TicketStatus.CANCELLED if roll < 0.3
                                else TicketStatus.VALID)
                method = rng.choice([PaymentMethod.CARD, PaymentMethod.ONLINE, PaymentMethod.CASH])
                p_status = (PaymentStatus.REFUNDED if t_status == TicketStatus.CANCELLED
                            else PaymentStatus.COMPLETED)
                ticket = Ticket(
                    event_id=ev.id,
                    seat_id=seat.id,
                    attendee_id=attendee.id,
                    seat_number=f"R{(i//10)+1}-S{(i%10)+1}",
                    qr_code=f"QR-{ev.id}-{i:04d}-{rng.randrange(10**6):06d}",
                    price=unit_price,
                    status=t_status,
                )
                s.add(ticket)
                s.flush()
                s.add(Payment(
                    ticket_id=ticket.id,
                    attendee_id=attendee.id,
                    amount=unit_price,
                    method=method,
                    status=p_status,
                    transaction_ref=f"TXN-{ev.id}-{ticket.id:05d}",
                ))
                added_tickets += 1
            s.commit()

    # ---------------------------------------------------------------
    # MongoDB: scan logs (one per USED ticket) + a small crowd timeline.
    # ---------------------------------------------------------------
    asyncio.run(_seed_mongo())

    # Report
    with Session(engine) as s:
        all_users = s.exec(select(User)).all()
        all_venues = s.exec(select(Venue)).all()
        all_seats = s.exec(select(Seat)).all()
        all_events = s.exec(select(Event)).all()
        all_tickets = s.exec(select(Ticket)).all()
        all_attendees = s.exec(select(Attendee)).all()
        print(f"Inserted {added_users} new user(s); table now has {len(all_users)}.")
        print(f"Inserted {added_venues} new venue(s); table now has {len(all_venues)}.")
        print(f"Inserted {added_seats} new seat(s); table now has {len(all_seats)}.")
        print(f"Inserted {added_events} new event(s); table now has {len(all_events)}.")
        print(f"Inserted {added_attendees} new attendee(s); table now has {len(all_attendees)}.")
        print(f"Inserted {added_tickets} new ticket(s); table now has {len(all_tickets)}.")
        print()
        print("Login credentials you can use:")
        for email, pwd, role, *_ in DEMO_USERS[:6]:
            print(f"  {email:30s}  {pwd:18s}  ({role.value})")


async def _seed_mongo():
    await init_mongo(document_models=DOCUMENT_MODELS)
    rng = random.Random(7)
    try:
        # ScanLogs: emit one entry per USED ticket so the staff Check-In
        # screen has a populated history.
        from app.models.sql.ticket import Ticket as _T
        with Session(engine) as s:
            used = list(s.exec(select(_T).where(_T.status == TicketStatus.USED)).all())
        added_scans = 0
        for t in used:
            existing = await ScanLog.find_one({"ticket_id": t.id})
            if existing:
                continue
            await ScanLog(
                ticket_id=t.id,
                event_id=t.event_id,
                attendee_id=t.attendee_id,
                gate=rng.choice(["Gate A", "Gate B", "VIP Gate"]),
                qr_code=t.qr_code,
                result=ScanResult.SUCCESS,
                manual=False,
                device_info={"device": "scanner-01", "os": "iOS 17"},
            ).insert()
            added_scans += 1

        # CrowdEvents: short rolling timeline per published event so the
        # Crowd Monitor has something to render even before live sensors.
        with Session(engine) as s:
            pub_events = list(s.exec(select(Event).where(Event.status == EventStatus.PUBLISHED)).all())
        zones = ["Main Stage", "East Entrance", "West Entrance", "VIP Area", "Food Court"]
        added_crowd = 0
        for ev in pub_events:
            # Only skip if this event already has the full seeded set
            # (12 readings). Stray manual entries shouldn't block backfill.
            existing = await CrowdEvent.find({"event_id": ev.id}).count()
            if existing >= 12:
                continue
            base = datetime.utcnow() - timedelta(minutes=60)
            # Per-zone counts are scaled to the event capacity so the
            # overall attendance bar stays under 100% of the venue.
            # Distribute roughly 60% of capacity across 5 zones, but cap
            # tiny events (e.g. 50-seat sold-out mixer) to a sane floor.
            cap = ev.capacity or 500
            target_total = min(cap * 0.6, cap - 5)
            zone_target = max(4, int(target_total / len(zones)))
            for i in range(12):
                zone = zones[i % len(zones)]
                # Vary ±35% around the target so cards aren't identical.
                count = max(10, int(zone_target * rng.uniform(0.55, 1.20)))
                density = round(count / max(zone_target, 1), 2)
                if count < zone_target * 0.6:
                    level = CrowdAlertLevel.NORMAL
                elif count < zone_target * 1.0:
                    level = CrowdAlertLevel.ELEVATED
                else:
                    level = CrowdAlertLevel.HIGH
                await CrowdEvent(
                    event_id=ev.id,
                    zone=zone,
                    people_count=count,
                    density=density,
                    alert_level=level,
                    source=CrowdSource.SENSOR,
                    sensor_id=f"S-{ev.id}-{i:02d}",
                    threshold_breached=level != CrowdAlertLevel.NORMAL,
                    recorded_at=base + timedelta(minutes=i * 5),
                ).insert()
                added_crowd += 1
        print(f"Inserted {added_scans} scan log(s) and {added_crowd} crowd event(s) into MongoDB.")
    finally:
        await close_mongo()


if __name__ == "__main__":
    seed()
