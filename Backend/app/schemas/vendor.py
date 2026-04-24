from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import PaymentMethod


class VendorBase(BaseModel):
    name: str = Field(max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    contact_email: Optional[EmailStr] = None
    booth_number: Optional[str] = Field(default=None, max_length=50)
    event_id: Optional[int] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    booth_number: Optional[str] = None
    event_id: Optional[int] = None


class VendorRead(VendorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class VendorAssignmentCreate(BaseModel):
    event_id: int
    booth_number: Optional[str] = Field(default=None, max_length=50)


class VendorAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vendor_id: int
    event_id: int
    booth_number: Optional[str]
    assigned_at: datetime


class VendorSaleCreate(BaseModel):
    vendor_id: int
    event_id: int
    item_description: str = Field(max_length=200)
    item_category: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(ge=1, default=1)
    unit_price: float = Field(gt=0)
    payment_method: PaymentMethod = PaymentMethod.CARD


class VendorSaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vendor_id: int
    event_id: int
    item_description: str
    item_category: Optional[str]
    quantity: int
    unit_price: float
    total_amount: float
    payment_method: PaymentMethod
    sold_at: datetime


# --- Reconciliation ---

from typing import List  # noqa: E402


class VendorTotal(BaseModel):
    vendor_id: int
    vendor_name: str
    total_amount: float
    transactions: int


class CategoryTotal(BaseModel):
    category: Optional[str]
    total_amount: float
    transactions: int


class PaymentMethodTotal(BaseModel):
    payment_method: PaymentMethod
    total_amount: float
    transactions: int


class EventReconciliation(BaseModel):
    event_id: int
    total_revenue: float
    total_transactions: int
    vendor_count: int
    by_vendor: List[VendorTotal]
    by_payment_method: List[PaymentMethodTotal]
    by_category: List[CategoryTotal]
