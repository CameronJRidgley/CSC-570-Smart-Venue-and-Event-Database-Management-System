"""Staff and StaffVendorAssignment tables.

Staff represents event personnel (security, medical, ushers, etc.).
StaffVendorAssignment is a join table tracking which staff members are
responsible for which vendors at a given event. The composite uniqueness
prevents assigning the same staff member to the same vendor/event twice.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint

from app.models.enums import StaffRole


class Staff(SQLModel, table=True):
    __tablename__ = "staff"

    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=200)
    email: str = Field(max_length=320, unique=True, index=True)
    phone: Optional[str] = Field(default=None, max_length=30)
    role: StaffRole = Field(default=StaffRole.USHER, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StaffVendorAssignment(SQLModel, table=True):
    __tablename__ = "staff_vendor_assignments"
    __table_args__ = (
        UniqueConstraint(
            "staff_id",
            "vendor_id",
            "event_id",
            name="uq_staff_vendor_event",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", index=True)
    vendor_id: int = Field(foreign_key="vendors.id", index=True)
    event_id: int = Field(foreign_key="events.id", index=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
