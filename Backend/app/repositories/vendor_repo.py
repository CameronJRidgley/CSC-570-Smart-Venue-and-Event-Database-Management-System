"""Vendor + vendor↔event assignment repository."""
from typing import List, Optional

from sqlmodel import Session, select

from app.models.sql.vendor import Vendor
from app.models.sql.vendor_assignment import VendorEventAssignment


# --- Vendors ---

def list_vendors(session: Session, skip: int = 0, limit: int = 100) -> List[Vendor]:
    return list(session.exec(select(Vendor).offset(skip).limit(limit)).all())


def get_vendor(session: Session, vendor_id: int) -> Optional[Vendor]:
    return session.get(Vendor, vendor_id)


def create_vendor(session: Session, vendor: Vendor) -> Vendor:
    session.add(vendor)
    session.commit()
    session.refresh(vendor)
    return vendor


# --- Assignments ---

def get_assignment(
    session: Session, vendor_id: int, event_id: int
) -> Optional[VendorEventAssignment]:
    stmt = select(VendorEventAssignment).where(
        VendorEventAssignment.vendor_id == vendor_id,
        VendorEventAssignment.event_id == event_id,
    )
    return session.exec(stmt).first()


def create_assignment(
    session: Session, assignment: VendorEventAssignment
) -> VendorEventAssignment:
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def list_assignments_for_vendor(
    session: Session, vendor_id: int
) -> List[VendorEventAssignment]:
    stmt = select(VendorEventAssignment).where(
        VendorEventAssignment.vendor_id == vendor_id
    )
    return list(session.exec(stmt).all())
