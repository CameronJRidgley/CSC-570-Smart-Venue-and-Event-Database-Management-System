"""Idempotent seed script: demo users + venues for the AdminUsers / login flows."""
from datetime import datetime
from sqlmodel import Session, select

from app.db.sql import engine
from app.models.sql.user import User
from app.models.sql.venue import Venue, Seat
from app.models.enums import UserRole, SeatingTier
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
]

DEMO_VENUES = [
    ("Riverside Park",     "123 River Rd",  "Austin",  "TX", "USA", 5000),
    ("Convention Center",  "500 Main St",   "Dallas",  "TX", "USA", 2000),
    ("Downtown Plaza",     "1 Plaza Way",   "Houston", "TX", "USA", 1500),
]


def seed():
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
        for name, addr, city, state, country, cap in DEMO_VENUES:
            existing = s.exec(select(Venue).where(Venue.name == name)).first()
            if existing:
                continue
            s.add(Venue(name=name, address=addr, city=city, total_capacity=cap))
            added_venues += 1

        s.commit()

        # Seats: ensure every venue has at least one General Admission seat
        # so ticket purchase can attach to a real seat row.
        added_seats = 0
        venues = s.exec(select(Venue)).all()
        for v in venues:
            existing = s.exec(
                select(Seat).where(Seat.venue_id == v.id, Seat.name == "General Admission")
            ).first()
            if existing:
                continue
            s.add(Seat(
                venue_id=v.id,
                name="General Admission",
                tier=SeatingTier.GENERAL,
                capacity=v.total_capacity,
                base_price=25.0,
            ))
            added_seats += 1

        s.commit()

    # Report
    with Session(engine) as s:
        all_users = s.exec(select(User)).all()
        all_venues = s.exec(select(Venue)).all()
        all_seats = s.exec(select(Seat)).all()
        print(f"Inserted {added_users} new user(s); table now has {len(all_users)}.")
        print(f"Inserted {added_venues} new venue(s); table now has {len(all_venues)}.")
        print(f"Inserted {added_seats} new seat(s); table now has {len(all_seats)}.")
        print()
        print("Login credentials you can use:")
        for email, pwd, role, *_ in DEMO_USERS[:6]:
            print(f"  {email:30s}  {pwd:18s}  ({role.value})")


if __name__ == "__main__":
    seed()
