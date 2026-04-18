"""VendorEventAssignment — join table binding a vendor to an event.

Allows one vendor to operate at many events and vice versa, while a DB
unique constraint prevents duplicate assignments for the same pair.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


class VendorEventAssignment(SQLModel, table=True):
    __tablename__ = "vendor_event_assignments"
    __table_args__ = (
        UniqueConstraint("vendor_id", "event_id", name="uq_vendor_event"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendors.id", index=True)
    event_id: int = Field(foreign_key="events.id", index=True)
    booth_number: Optional[str] = Field(default=None, max_length=50)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
