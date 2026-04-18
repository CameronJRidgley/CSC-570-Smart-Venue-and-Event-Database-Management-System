"""Vendor sale repository + SQL aggregations for reconciliation."""
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.enums import PaymentMethod
from app.models.sql.vendor import Vendor, VendorSale


def create_sale(session: Session, sale: VendorSale) -> VendorSale:
    session.add(sale)
    session.commit()
    session.refresh(sale)
    return sale


def list_sales_for_vendor(
    session: Session, vendor_id: int, newest_first: bool = True
) -> List[VendorSale]:
    stmt = select(VendorSale).where(VendorSale.vendor_id == vendor_id)
    stmt = stmt.order_by(
        VendorSale.sold_at.desc() if newest_first else VendorSale.sold_at.asc()
    )
    return list(session.exec(stmt).all())


def list_sales_for_event(
    session: Session, event_id: int, newest_first: bool = True
) -> List[VendorSale]:
    stmt = select(VendorSale).where(VendorSale.event_id == event_id)
    stmt = stmt.order_by(
        VendorSale.sold_at.desc() if newest_first else VendorSale.sold_at.asc()
    )
    return list(session.exec(stmt).all())


# --- Aggregations for reconciliation ---

def totals_by_vendor_for_event(
    session: Session, event_id: int
) -> List[Tuple[int, str, float, int]]:
    """Returns list of (vendor_id, vendor_name, total_amount, tx_count)."""
    stmt = (
        select(
            VendorSale.vendor_id,
            Vendor.name,
            func.coalesce(func.sum(VendorSale.total_amount), 0.0),
            func.count(VendorSale.id),
        )
        .join(Vendor, Vendor.id == VendorSale.vendor_id)
        .where(VendorSale.event_id == event_id)
        .group_by(VendorSale.vendor_id, Vendor.name)
        .order_by(func.sum(VendorSale.total_amount).desc())
    )
    return list(session.exec(stmt).all())


def totals_by_payment_method_for_event(
    session: Session, event_id: int
) -> List[Tuple[PaymentMethod, float, int]]:
    stmt = (
        select(
            VendorSale.payment_method,
            func.coalesce(func.sum(VendorSale.total_amount), 0.0),
            func.count(VendorSale.id),
        )
        .where(VendorSale.event_id == event_id)
        .group_by(VendorSale.payment_method)
    )
    return list(session.exec(stmt).all())


def totals_by_category_for_event(
    session: Session, event_id: int
) -> List[Tuple[Optional[str], float, int]]:
    stmt = (
        select(
            VendorSale.item_category,
            func.coalesce(func.sum(VendorSale.total_amount), 0.0),
            func.count(VendorSale.id),
        )
        .where(VendorSale.event_id == event_id)
        .group_by(VendorSale.item_category)
    )
    return list(session.exec(stmt).all())


def event_totals(session: Session, event_id: int) -> Tuple[float, int]:
    """Returns (total_revenue, total_transactions)."""
    stmt = select(
        func.coalesce(func.sum(VendorSale.total_amount), 0.0),
        func.count(VendorSale.id),
    ).where(VendorSale.event_id == event_id)
    revenue, tx = session.exec(stmt).one()
    return float(revenue), int(tx)
