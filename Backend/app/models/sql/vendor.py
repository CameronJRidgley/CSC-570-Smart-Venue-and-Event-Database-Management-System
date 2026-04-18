"""Vendor and VendorSale tables.

A Vendor is a concessions / merchandise operator attached (optionally)
to an Event. VendorSale records each transaction; aggregating over
VendorSale powers revenue reports in Milestone 8.
"""
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.enums import PaymentMethod


class Vendor(SQLModel, table=True):
    __tablename__ = "vendors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    contact_email: Optional[str] = Field(default=None, max_length=320)
    booth_number: Optional[str] = Field(default=None, max_length=50)
    event_id: Optional[int] = Field(default=None, foreign_key="events.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VendorSale(SQLModel, table=True):
    __tablename__ = "vendor_sales"

    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendors.id", index=True)
    event_id: int = Field(foreign_key="events.id", index=True)

    item_description: str = Field(max_length=200)
    item_category: Optional[str] = Field(default=None, max_length=100, index=True)
    quantity: int = Field(ge=1, default=1)
    unit_price: float = Field(ge=0)
    total_amount: float = Field(ge=0)
    payment_method: PaymentMethod = Field(default=PaymentMethod.CARD, index=True)

    sold_at: datetime = Field(default_factory=datetime.utcnow, index=True)
