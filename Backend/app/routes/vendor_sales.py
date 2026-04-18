"""Vendor sales ledger and reconciliation endpoints.

Powers the **Vendor Portal**:
  - Sales Entry         → POST /api/vendor-sales
  - Sales History       → GET  /api/vendor-sales/{vendor_id}
  - Event sales list    → GET  /api/vendor-sales/event/{event_id}
  - Reconciliation View → GET  /api/vendor-sales/reconciliation/{event_id}

The reconciliation endpoint aggregates per-vendor and grand totals for
an event and is also consumed by the **Organizer Dashboard**'s revenue
widget.
"""
from typing import List

from fastapi import APIRouter, status

from app.core.dependencies import SessionDep
from app.schemas.vendor import (
    EventReconciliation,
    VendorSaleCreate,
    VendorSaleRead,
)
from app.services import vendor_service

router = APIRouter(prefix="/vendor-sales", tags=["vendor-sales"])


@router.post(
    "",
    response_model=VendorSaleRead,
    status_code=status.HTTP_201_CREATED,
)
def record_sale(payload: VendorSaleCreate, session: SessionDep):
    return vendor_service.record_sale(session, payload)


@router.get("/{vendor_id}", response_model=List[VendorSaleRead])
def list_vendor_sales(vendor_id: int, session: SessionDep):
    return vendor_service.list_sales_for_vendor(session, vendor_id)


@router.get("/event/{event_id}", response_model=List[VendorSaleRead])
def list_event_sales(event_id: int, session: SessionDep):
    return vendor_service.list_sales_for_event(session, event_id)


@router.get(
    "/reconciliation/{event_id}", response_model=EventReconciliation
)
def event_reconciliation(event_id: int, session: SessionDep):
    return vendor_service.reconcile_event(session, event_id)
