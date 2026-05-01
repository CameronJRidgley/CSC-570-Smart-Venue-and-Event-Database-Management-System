from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import StaffRole


class StaffBase(BaseModel):
    full_name: str = Field(max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    role: StaffRole = StaffRole.USHER
    badge_number: Optional[str] = Field(default=None, max_length=50)
    duty_status: Optional[str] = Field(default="On Duty", max_length=20)
    event_id: Optional[int] = None
    zone: Optional[str] = Field(default=None, max_length=100)


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[StaffRole] = None
    badge_number: Optional[str] = None
    duty_status: Optional[str] = None
    event_id: Optional[int] = None
    zone: Optional[str] = None


class StaffRead(StaffBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
