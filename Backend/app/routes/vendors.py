"""Vendor registration and event-assignment endpoints.

Powers the **Vendor Portal** and (admin side of) the **Organizer
Dashboard**:
  - Vendor Profile / list    → GET  /api/vendors, GET /api/vendors/{id}
  - Register a vendor        → POST /api/vendors
  - Assign vendor to event   → POST /api/vendors/{id}/assignments

A vendor must be assigned to an event before they can record sales
against it (see vendor_sales.py).
"""
from typing import List

from fastapi import APIRouter, Query, status

from app.core.dependencies import SessionDep
from app.schemas.vendor import (
    VendorAssignmentCreate,
    VendorAssignmentRead,
    VendorCreate,
    VendorRead,
)
from app.services import vendor_service

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorRead])
def list_vendors(
    session: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return vendor_service.list_vendors(session, skip=skip, limit=limit)


@router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(vendor_id: int, session: SessionDep):
    return vendor_service.get_vendor(session, vendor_id)


@router.post("", response_model=VendorRead, status_code=status.HTTP_201_CREATED)
def create_vendor(payload: VendorCreate, session: SessionDep):
    return vendor_service.create_vendor(session, payload)


@router.post(
    "/{vendor_id}/assignments",
    response_model=VendorAssignmentRead,
    status_code=status.HTTP_201_CREATED,
)
def assign_vendor(
    vendor_id: int, payload: VendorAssignmentCreate, session: SessionDep
):
    return vendor_service.assign_vendor_to_event(session, vendor_id, payload)
