from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import StaffRole


class StaffBase(BaseModel):
    full_name: str = Field(max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    role: StaffRole = StaffRole.USHER


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[StaffRole] = None


class StaffRead(StaffBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
