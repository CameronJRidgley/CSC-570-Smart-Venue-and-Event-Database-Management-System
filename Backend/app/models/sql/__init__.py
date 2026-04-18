"""SQL model registry.

Importing this package eagerly loads every SQLModel table so that
`SQLModel.metadata` is fully populated before Alembic autogenerates
migrations (Milestone 9) or before `SQLModel.metadata.create_all` is
called in tests.
"""
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

__all__ = [
    "Attendee",
    "Event",
    "Incident",
    "Payment",
    "SeatingSection",
    "Staff",
    "StaffVendorAssignment",
    "Ticket",
    "User",
    "Vendor",
    "VendorEventAssignment",
    "VendorSale",
    "Venue",
]
