"""Vendor & vendor-sales business logic."""
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models.sql.event import Event
from app.models.sql.vendor import Vendor, VendorSale
from app.models.sql.vendor_assignment import VendorEventAssignment
from app.repositories import vendor_repo, vendor_sale_repo
from app.schemas.vendor import (
    CategoryTotal,
    EventReconciliation,
    PaymentMethodTotal,
    VendorAssignmentCreate,
    VendorAssignmentRead,
    VendorCreate,
    VendorRead,
    VendorSaleCreate,
    VendorSaleRead,
    VendorTotal,
)


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

def _get_vendor_or_404(session: Session, vendor_id: int) -> Vendor:
    v = vendor_repo.get_vendor(session, vendor_id)
    if v is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vendor not found")
    return v


def _assert_event_exists(session: Session, event_id: int) -> None:
    if session.get(Event, event_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")


# ---------------------------------------------------------------------------
# Vendors
# ---------------------------------------------------------------------------

def list_vendors(
    session: Session, skip: int = 0, limit: int = 100
) -> List[VendorRead]:
    rows = vendor_repo.list_vendors(session, skip=skip, limit=limit)
    return [VendorRead.model_validate(v) for v in rows]


def get_vendor(session: Session, vendor_id: int) -> VendorRead:
    return VendorRead.model_validate(_get_vendor_or_404(session, vendor_id))


def create_vendor(session: Session, payload: VendorCreate) -> VendorRead:
    if payload.event_id is not None:
        _assert_event_exists(session, payload.event_id)

    vendor = Vendor(
        name=payload.name,
        category=payload.category,
        contact_email=payload.contact_email,
        booth_number=payload.booth_number,
        event_id=payload.event_id,
    )
    vendor = vendor_repo.create_vendor(session, vendor)
    return VendorRead.model_validate(vendor)


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

def assign_vendor_to_event(
    session: Session, vendor_id: int, payload: VendorAssignmentCreate
) -> VendorAssignmentRead:
    _get_vendor_or_404(session, vendor_id)
    _assert_event_exists(session, payload.event_id)

    # Fast duplicate check
    existing = vendor_repo.get_assignment(session, vendor_id, payload.event_id)
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Vendor is already assigned to this event",
        )

    assignment = VendorEventAssignment(
        vendor_id=vendor_id,
        event_id=payload.event_id,
        booth_number=payload.booth_number,
    )
    try:
        assignment = vendor_repo.create_assignment(session, assignment)
    except IntegrityError as exc:
        session.rollback()
        # Race: another request inserted the same (vendor, event) pair first.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Vendor is already assigned to this event",
        ) from exc
    return VendorAssignmentRead.model_validate(assignment)


# ---------------------------------------------------------------------------
# Sales
# ---------------------------------------------------------------------------

def record_sale(
    session: Session, payload: VendorSaleCreate
) -> VendorSaleRead:
    _get_vendor_or_404(session, payload.vendor_id)
    _assert_event_exists(session, payload.event_id)

    # Enforce "vendor must be assigned to the event" business rule.
    if vendor_repo.get_assignment(session, payload.vendor_id, payload.event_id) is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Vendor is not assigned to this event. Create an assignment first.",
        )

    # Defensive: unit_price > 0 already enforced by Pydantic; quantity >= 1 too.
    total_amount = round(payload.unit_price * payload.quantity, 2)

    sale = VendorSale(
        vendor_id=payload.vendor_id,
        event_id=payload.event_id,
        item_description=payload.item_description,
        item_category=payload.item_category,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_amount=total_amount,
        payment_method=payload.payment_method,
    )
    sale = vendor_sale_repo.create_sale(session, sale)
    return VendorSaleRead.model_validate(sale)


def list_sales_for_vendor(
    session: Session, vendor_id: int
) -> List[VendorSaleRead]:
    _get_vendor_or_404(session, vendor_id)
    rows = vendor_sale_repo.list_sales_for_vendor(session, vendor_id)
    return [VendorSaleRead.model_validate(s) for s in rows]


def list_sales_for_event(
    session: Session, event_id: int
) -> List[VendorSaleRead]:
    _assert_event_exists(session, event_id)
    rows = vendor_sale_repo.list_sales_for_event(session, event_id)
    return [VendorSaleRead.model_validate(s) for s in rows]


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------

def reconcile_event(session: Session, event_id: int) -> EventReconciliation:
    _assert_event_exists(session, event_id)

    revenue, tx_count = vendor_sale_repo.event_totals(session, event_id)

    by_vendor_rows = vendor_sale_repo.totals_by_vendor_for_event(session, event_id)
    by_method_rows = vendor_sale_repo.totals_by_payment_method_for_event(session, event_id)
    by_category_rows = vendor_sale_repo.totals_by_category_for_event(session, event_id)

    return EventReconciliation(
        event_id=event_id,
        total_revenue=round(float(revenue), 2),
        total_transactions=tx_count,
        vendor_count=len(by_vendor_rows),
        by_vendor=[
            VendorTotal(
                vendor_id=vid,
                vendor_name=name,
                total_amount=round(float(total), 2),
                transactions=int(cnt),
            )
            for vid, name, total, cnt in by_vendor_rows
        ],
        by_payment_method=[
            PaymentMethodTotal(
                payment_method=method,
                total_amount=round(float(total), 2),
                transactions=int(cnt),
            )
            for method, total, cnt in by_method_rows
        ],
        by_category=[
            CategoryTotal(
                category=cat,
                total_amount=round(float(total), 2),
                transactions=int(cnt),
            )
            for cat, total, cnt in by_category_rows
        ],
    )
